function setSessions(val) {
  if (navigator.id) {
    navigator.id.sessions = val ? val : [ ];
  }
} 

function loggedIn(email) {
  setSessions([ { email: email } ]);

  $("#content .intro").fadeOut(700, function() {
    $("#content .business").fadeIn(300, function() {
    });
  });

  // enter causes us to save the value and do a little animation
  $('input').keypress(function(e){
    if(e.which == 13) {
      window.localStorage.setItem(email, $("input").val());
      $("#content input").fadeOut(200).fadeIn(400);
      e.preventDefault();
    }
  });

  $("input").val(window.localStorage.getItem(email));
}

function gotVerifiedEmail(assertion) {
  if (assertion) {
    // Now we'll send this assertion over to the verification server for validation
    // WARNING: This is only an example. In real apps, this verification step must be done from server-side code. 
    $.ajax({
      url: 'https://browserid.org/verify',
      type: 'POST',
      dataType: "json",
      data: {
        audience: window.location.host,
        assertion: assertion
      },
      success: function(data, textStatus, jqXHR) {
        var l = $("#header .login").removeClass('clickable');;
        l.empty();
        l.css('opacity', '1');
        l.append($("<span>").text("Yo, "))
          .append($("<span>").text(data.email).addClass("username"))
          .append($("<span>!</span>"));
        l.append($('<div><a href="/" >(logout)</a></div>'));
        l.unbind('click');

        var iurl = 'http://www.gravatar.com/avatar/' +
          Crypto.MD5($.trim(data.email).toLowerCase()) +
          "?s=32";
        $("<img>").attr('src', iurl).appendTo($("#header .picture"));

        loggedIn(data.email);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $("#header .login").css('opacity', '1');
      }
    });
  } else {
    // something went wrong!  the user isn't logged in.
    $("#header .login").css('opacity', '1');
  }
}

$(document).ready(function() {
  $("#header .login").show().click(function() {
    $("#header .login").css('opacity', '0.5');
    navigator.id.getVerifiedEmail(gotVerifiedEmail);
  }).addClass("clickable");
});

$(document).bind("login", function(event) {
  $("#header .login").css('opacity', '0.5');
  navigator.id.getVerifiedEmail(gotVerifiedEmail);
},false);

$(document).bind("logout", function(event) {
  window.location.href = "/";
},false);

setSessions();
