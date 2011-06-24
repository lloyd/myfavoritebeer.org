function loggedIn() {
  $("#content .intro").fadeOut(700, function() {
    $("#content .business").fadeIn(300, function() {
    });
  });
}

$(document).ready(function() {
  $("#header .login").show().click(function() {
    $("#header .login").css('opacity', '0.5');
    navigator.id.getVerifiedEmail(function(assertion) {
      if (assertion) {
        // Now we'll send this assertion over to the verification server for validation
        var url = "https://browserid.org/verify?assertion=" + window.encodeURIComponent(assertion) +
          "&audience=" + window.encodeURIComponent(window.location.host);
        $.ajax({
          url: url,
          dataType: "json",
          success: function(data, textStatus, jqXHR) {
            var l = $("#header .login").removeClass('clickable');;
            l.empty();
            l.css('opacity', '1');
            l.append($("<span>").text("Yo, "))
              .append($("<span>").text(data.email).addClass("username"))
              .append($("<span>!</span>"));
            l.unbind('click');

            var iurl = 'http://www.gravatar.com/avatar/' +
              Crypto.MD5($.trim(data.email).toLowerCase()) +
              "?s=32";
            $("<img>").attr('src', iurl).appendTo($("#header .picture"));

            loggedIn();
          },
          error: function(jqXHR, textStatus, errorThrown) {
            $("#header .login").css('opacity', '1');
          }
        });
      } else {
        // something went wrong!  the user isn't logged in.
        $("#header .login").css('opacity', '1');
      }
    });
  }).addClass("clickable");
});
