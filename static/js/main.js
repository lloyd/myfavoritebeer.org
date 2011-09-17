// Add these in for IE that does not have dev tools open
window.console = window.console || {};
console.log = console.log || function() {};

function setSessions(val) {
  if (navigator.id) {
    navigator.id.sessions = val ? val : [ ];
  }
} 

function loggedIn(email, immediate) {
  setSessions([ { email: email } ]);

  // set the user visible display
  var l = $("header .login").removeClass('clickable');;
  l.empty();
  l.css('opacity', '1');
  l.append($("<span>").text("Yo, "))
    .append($("<span>").text(email).addClass("username"))
    .append($("<span>!</span>"));
  l.append($('<div><a id="logout" href="#" >(logout)</a></div>'));
  l.unbind('click');
  
  $("#logout").bind('click', logout);

  if (immediate) {
    $("#content .intro").hide();
    $("#content .business").fadeIn(300);
  }
  else {
    $("#content .intro").fadeOut(700, function() {
      $("#content .business").fadeIn(300);
    });
  }

  // enter causes us to save the value and do a little animation
  $('input').keypress(function(e){
    if(e.which == 13) {
      $.ajax({
        type: 'POST',
        url: '/api/set',
        data: { beer: $("input").val() },
        success: function(res, status, xhr) {
          console.log("successfully set beer:", res);
        }
      });
      $("#content input").fadeOut(200).fadeIn(400);
      e.preventDefault();
    }
  });

  $.ajax({
    type: 'GET',
    url: '/api/get',
    success: function(res, status, xhr) {
      console.log("successfully got beer:", res);
      $("input").val(res);
    }
  });

  // get a gravatar cause it's pretty
  var iurl = 'http://www.gravatar.com/avatar/' +
    Crypto.MD5($.trim(email).toLowerCase()) +
    "?s=32";
  $("<img>").attr('src', iurl).appendTo($("header .picture"));
}

function logout(event) {
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: '/api/logout',
    success: function() {
      document.location = '/';
    }
  });
}


function loggedOut() {
  setSessions();
  $('.intro').fadeIn(300);
  var l = $("header .login").removeClass('clickable');
  l.html('<img src="i/sign_in_blue.png" alt="Sign in">')
    .show().click(function() {
      $("header .login").css('opacity', '0.5');
      navigator.id.getVerifiedEmail(gotVerifiedEmail);
    }).addClass("clickable");
}

function gotVerifiedEmail(assertion) {
  // got an assertion, now send it up to the server for verification
  $.ajax({
    type: 'POST',
    url: '/api/login',
    data: { assertion: assertion },
    success: function(res, status, xhr) {
      if (res === null) loggedOut();
      else loggedIn(res);
    },
    error: function(res, status, xhr) {
      alert("login failure" + res);
    }
  });
}

// For some reason, login/logout do not respond when bound using jQuery
if (document.addEventListener) {
  document.addEventListener("login", function(event) {
    $("header .login").css('opacity', '0.5');
    navigator.id.getVerifiedEmail(gotVerifiedEmail);
  }, false);

  document.addEventListener("logout", logout, false);
}

$(function() {
  $.get('/api/whoami', function (res) {
    if (res === null) loggedOut();
    else loggedIn(res, true);
  }, 'json');
});
