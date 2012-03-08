var browseridArguments = {
  // display our tos and privacy policy in the browserid dialog
  privacyURL: '/privacy.html',
  tosURL: '/tos.html',
};

// when no user is logged in, we'll display a "sign-in" button
// which will call into browserid when clicked.
$(document).ready(function() {
  $("#loginInfo div.login").click(function() {
    navigator.id.get(function(assertion) {
      if (assertion !== null) {
        $.ajax({
          type: 'POST',
          url: '/api/login',
          data: { assertion: assertion },
          success: function(res, status, xhr) {
            if (res === null) window.location = '/';
            else loggedIn(res);
          },
          error: function(xhr, status, error) {
            alert("login failure " + error);
          }
        });
      }
      else {
        loggedOut();
      }
    });
  });
});
