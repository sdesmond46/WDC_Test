// TODO - Update me with what the proper app id is
var CLIENT_ID = ""; // TODO - You must enter your own app id to use this exampe
CLIENT_ID = "475960835902299";
if (CLIENT_ID.length == 0) {
	alert("You have not supplied an app id. The connector will not work")
}
var REQUESTED_SCOPE = "user_status,user_likes,user_posts";
var REDIRECT_PAGE = "/FB_Redirect.html";
var ACCESS_TOKEN_COOKIE_NAME = "fb_access_token";

// Helper function to build up the url we will send a user to in order to authenticate with Facebook
function _getFacebookAuthUrl() {
	var redirectUrl = window.location.protocol + '//' + window.location.hostname;
	if (window.location.port.length > 0) {
		redirectUrl += ":" + window.location.port;
	}
	
	var pathName = window.location.pathname;
	var dir = pathName.substring(0, pathName.lastIndexOf('/'));

	redirectUrl += dir + REDIRECT_PAGE;
	console.log("Redirect page is '" + redirectUrl + "'");

	var url = "https://www.facebook.com/dialog/oauth?response_type=token&" +
		"client_id=" + CLIENT_ID + "&" +
		"redirect_uri=" + redirectUrl + "&" +
		"scope=" + REQUESTED_SCOPE;
    
	return url;
}

// Gets a parameter from the query string by name
// Adapted from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function _getUrlParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match ?
        decodeURIComponent(match[1].replace(/+/g, ' '))
        : null;
}

// Attempts to get an access token embeded in the query string of the current window location
// If no access token is there, returns null
function _getAccessTokenFromQueryString() {
	var accessTokenName = "#access_token";
	var token = _getUrlParameterByName(accessTokenName);
	return token;
}
