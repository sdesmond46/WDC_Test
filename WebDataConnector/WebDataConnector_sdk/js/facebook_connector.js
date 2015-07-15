$(document).ready(function() {
  $("#inputForm").submit(function() { // This event fires when a button is clicked
    event.preventDefault();
    tableau.connectionData = "";
    tableau.connectionName = "Samm's Facebook connector";
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

var getPassword = function() {
  var cookie = $.cookie('fb_access_token');
  var password = "";
  if (!!cookie) {
    password = cookie; // we have a cookie. Lets eat it
  } else if (!!tableau && !!tableau.password && tableau.password.length > 0) {
    password = tableau.password;
  }

  // TODO - validate the access token is still good even if it is not empty
  return password;
}

 // Set up the actual connector
var myConnector = tableau.makeConnector();

myConnector.init = function() {
  var pw = getPassword();
  var needsAuth = pw.length == 0;

  // Do a check if tableau.phase is defined. This will allow this connector to work before and after the oauth changes
  if (!tableau.phase) {
    if (tableau.interactive) {
      if (needsAuth) {
        window.location = "./FB_Redirect.html";
      } else {
        tableau.password = pw;
        tableau.initCallback();
      }
    } else {
      if (needsAuth) {
        tableau.abortWithError("I need a password but I don't have a valid one");
      } else {
        tableau.password = pw;
        tableau.initCallback();
      }
    }
  } else {
    tableau.alwaysShowAuthUI = true;

    if (tableau.phase == "interactive") {
      console.log("Im in interactive!");
      if (needsAuth) {
        window.location = "./FB_Redirect.html";
      } else {
        tableau.password = pw;
        tableau.initCallback();
      }
    } else if (tableau.phase == "auth") {
      if (needsAuth) {
        window.location = _getFacebookAuthUrl(); // If we're in the auth phase, go straight to the auth url
      } else {
        tableau.password = pw;
        tableau.initCallback();
        tableau.submit(); // submit immediately since I have my auth cookie
      }
    } else if(tableau.phase == "gatherData") {
      console.log("I'm in gather data!");
      if (needsAuth) {
        tableau.abortWithError("I need a password but I don't have a valid one");
      } else {
        tableau.password = pw;
        tableau.initCallback();
      }
    } else {
      tableau.abortWithError("Unknown phase encountered. Uh oh");
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
      async: false, // process this synchronously because why not?
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
  });
};

tableau.registerConnector(myConnector);

