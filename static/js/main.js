function setSessions(val) {
  if (navigator.id) {
    navigator.id.sessions = val ? val : [ ];
  }
} 

function loggedIn(email) {
  setSessions([ { email: email } ]);

  // set the user visible display
  var l = $("#header .login").removeClass('clickable');;
  l.empty();
  l.css('opacity', '1');
  l.append($("<span>").text("Yo, "))
    .append($("<span>").text(email).addClass("username"))
    .append($("<span>!</span>"));
  l.append($('<div><a href="/" >(logout)</a></div>'));
  l.unbind('click');

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

  // get a gravatar cause it's pretty
  var iurl = 'http://www.gravatar.com/avatar/' +
    Crypto.MD5($.trim(email).toLowerCase()) +
    "?s=32";
  $("<img>").attr('src', iurl).appendTo($("#header .picture"));
}

function loggedOut() {
  setSessions();
  var l = $("#header .login").removeClass('clickable');
  console.log("creating login button");
  l.html('<img src="i/sign_in_blue.png" alt="Sign in">')
    .show().click(function() {
      $("#header .login").css('opacity', '0.5');
      navigator.id.getVerifiedEmail(gotVerifiedEmail);
    }).addClass("clickable");
}

function gotVerifiedEmail(assertion) {
  // got an assertion, now send it up to the server for verification
  console.log("send ass", assertion);
  $.ajax({
    type: 'POST',
    url: '/api/login',
    data: { assertion: assertion },
    success: function(res, status, xhr) {
      console.log("got res", res);
      if (res === null) loggedOut();
      else loggedIn(res);
    },
    error: function(res, status, xhr) {
      console.log("login failure" + res);
    }
  });
}

$(document).bind("login", function(event) {
  $("#header .login").css('opacity', '0.5');
  navigator.id.getVerifiedEmail(gotVerifiedEmail);
},false);

$(document).bind("logout", function(event) {
  window.location.href = "/";
},false);

$(function() {
  $.get('/api/whoami', function (res) {
    console.log(res);
    if (res === null) loggedOut();
    else loggedIn(res);
  }, 'json');
});
