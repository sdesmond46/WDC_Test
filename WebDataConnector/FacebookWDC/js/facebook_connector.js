$(document).ready(function() {
  // Wire up the submission form once the document loads
  $("#inputForm").submit(function() {
    event.preventDefault();
    tableau.connectionData = "";
    tableau.connectionName = "Facebook connector for personal pages";
    tableau.submit();
  });
});

// Creates our url to request data from facebook
var createRequestUrl = function(obj, fieldsString, accessToken) {
  var url = "https://graph.facebook.com/v2.3/";
  url += obj + "?";

  var queryParmas = "";
  queryParmas += "access_token=" + accessToken;
  queryParmas += "&debug=all&format=json&method=get&pretty=0&suppress_http_code=1";
  queryParmas += "&fields=" + encodeURIComponent(fieldsString);
  queryParmas += "&date_format=U";

  url += queryParmas;

  return url;
}

// Helper function to retrieve the access token either from a cookie or from the tableau.password field
var getPassword = function() {
  var cookie = $.cookie(ACCESS_TOKEN_COOKIE_NAME);
  var password = "";
  if (!!cookie) {
    password = cookie; // we have a cookie. Lets eat it
  } else if (!!tableau && !!tableau.password && tableau.password.length > 0) {
    password = tableau.password; // There is an access token stored in the tableau.password property
  }

  // TODO - validate the access token is still good even if it is not empty
  // We could use the graph.facebook.com/debug_token endpoint to validate
  return password;
}

 // Set up the actual Tableau connector
var myConnector = tableau.makeConnector();

myConnector.init = function() {
  // First check the state of our password. If we don't have one, we'll need to prompt for auth
  var pw = getPassword();
  var needsAuth = pw.length == 0;

  // Set the alwaysShowAuthUI to cause WDC to reprompt us when re-opening a workbook and refreshing an extract
  tableau.alwaysShowAuthUI = true;

  console.log("Tableau phase is " + tableau.phase);
  if (tableau.phase == tableau.phaseEnum.gatherDataPhase) {
    // We're in the headless, gathering data phase
    if (needsAuth) {
      tableau.abortWithError("No access token provided to communicate with Facebook. Cannot gather data.");
    } else {
      tableau.password = pw;
      tableau.initCallback();
    }
  } else {
    // We are in the interactive or auth modes. If auth is needed, let's just redirect to the login page right away
    if (needsAuth) {
      window.location = _getFacebookAuthUrl();
    } else {
      tableau.password = pw;
      tableau.initCallback();
      if (tableau.phase == tableau.phaseEnum.authPhase) {
        // If we have a password already, and we're in the auth phase, immediately call submit for the user to indicate we have authenticated
        tableau.submit();
      }
    }
  }
}

myConnector.getColumnHeaders = function() {
  var fieldNames = ['post_id', 'date', 'user_name', 'user_id', 'like_count', 'link'];
  var fieldTypes = ['string', 'datetime', 'string', 'string', 'int', 'string'];
  tableau.headersCallback(fieldNames, fieldTypes);
};

// Process a section of like data from a particular post
var processLikes = function(outputArray, rowData, post) {

  // process an individual like item and adds it to the returned data
  var processLike = function(like) {
    var userName = like.name;
    var userId = like.id;

    // clone the object so that Qt doesn't barf during data marshalling
    var clonedObject = jQuery.extend(true, {}, rowData);

    clonedObject["user_name"] = userName;
    clonedObject["user_id"] = userId;
    clonedObject["like_count"] = 1;

    outputArray.push(clonedObject);
  };

  // Process the initial set of likes in a for loop
  var likes = post.likes;
  for (var j in likes.data) {
    var like = likes.data[j];
    processLike(like);
  }

  // Do a check to see if there are multiple pages of likes
  if (!!likes.paging && !!likes.paging.next) {
    $.ajax({
      url : likes.paging.next,
      type : "get",
      async: false, // process this synchronously because why not? We're running in the background
      success : function(likeData) {
        for (var j in likeData.data) {
          processLike(likeData.data[j]);
        }
      }
    });
  }
}
 
myConnector.getTableData = function(lastRecordToken) {
  var accessToken = tableau.password;

  var requestUrl;
  if (lastRecordToken) {
    requestUrl = lastRecordToken; // If there's a last record token, that means we're doing soem paging
  } else {
    requestUrl = createRequestUrl("me/feed", "id,likes,created_time,link", accessToken);
  }

  $.get(requestUrl,
  null,
  function(data, status, jqXHR) {
    var returnData = [];
    // Go through each row of the data array
    for (var i in data.data) {
      var post = data.data[i];
      var id = post["id"];
      var permalink = post["link"];
      var ticks = parseInt(post["created_time"]);
      var createdTime = new Date(ticks * 1000); // convert to MS from seconds

      // Get the base row data set up
      var rowData = {
        "post_id" : id,
        "date" : createdTime.toISOString(),
        "user_name" : "",
        "user_id" : "",
        "like_count" : 0, // Init like count to 0. This allows us to get every post, even those without likes
        "link" : permalink
      };

      if (post.hasOwnProperty("likes")) {
        processLikes(returnData, rowData, post);
      } else {
        returnData.push(rowData);
      }
    }

    console.log(JSON.stringify(returnData));

    // Check if there is a next page token
    var nextPageToken = "";
    if (!!data.paging && !!data.paging.next) {
      nextPageToken = data.paging.next.toString();
    }

    // If there is a next page token, we have more data
    var moreData = nextPageToken.length > 0;
    tableau.dataCallback(returnData, nextPageToken, moreData);
  })
  .fail(function(jqXHR, textStatus, errorThrown) {
    tableau.abortWithError("Error encountered loading data from Facebook. Error was '" + textStatus + "'");
  });
};

tableau.registerConnector(myConnector);
