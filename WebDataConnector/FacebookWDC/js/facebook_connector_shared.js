
// TODO - Update me with what the proper app id is
var CLIENT_ID = "475960835902299"; // This is Samm's personal app id
// var CLIENT_ID = "131331403865338"; // This is the the Tableau id that Francois put in 
var REQUESTED_SCOPE = "user_status,user_likes,user_posts";
var REDIRECT_PAGE = "FacebookWDC/FB_Redirect.html";


function _getFacebookAuthUrl() {
	var redirectUrl = window.location.protocol + '//' + window.location.hostname;
	if (window.location.port.length > 0) {
		redirectUrl += ":" + window.location.port;
	}
	
	redirectUrl += "/" + REDIRECT_PAGE;

	var url = "https://www.facebook.com/dialog/oauth?response_type=token&" +
		"client_id=" + CLIENT_ID + "&" +
		"redirect_uri=" + redirectUrl + "&" +
		"scope=" + REQUESTED_SCOPE;
    
    console.log("Auth URL is " + url);
    
	return url;
}