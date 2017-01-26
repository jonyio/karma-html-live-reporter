(function () { "use strict"; 

var App = window.App = { config: {} };
var config = App.config;
var $body = $(document.body);


App.haltTransitions = function (duration) { // temporarily halt some transitions
  $body.addClass('no-transitions');
  setTimeout(function () { 
    $body.removeClass('no-transitions'); 
  }, duration || 100);
};

App.socket = io.connect('ws://' + document.location.host);
App.socket.on('config', function (data) { // config is sent right after connecting
  _.extend(config, data);
  App.fold[config.focusMode ? 'enableFocus' : 'disableFocus']();
  document.title = config.pageTitle;
});

App.socket.on('disconnect', function () {
  $('#info-toggle').addClass('no-connection');
  $('#help').hide();
  $('#no-connection').show();
});
App.socket.on('reconnect', function () {
  $('#info-toggle').removeClass('no-connection');
  $('#help').show();
  $('#no-connection').hide();
  $('#info').hide();
});

$('#info-toggle').on('click', function () { // '?' button 
  $('#info').toggle(0);
});
$('#tabs').on('click', '.tab', function (e) { // Summary | Failures 
  $body.toggleClass('show-failures', $(e.target).hasClass('failures'));
});


// 1-9 keys select browsers
Mousetrap.bind(['1','2','3','4','5','6','7','8','9'], function(e, key) {
  var $browsers = $('#browsers .browser-tab').not('.disconnected');
  var number = key - 1;
  if (!$browsers.length) return false;
  if (key > $browsers.length - 1) number = $browsers.length - 1;
  $browsers.eq(number).trigger('click');
  return false;
});

// '/' or '?' key toggles the info panel 
Mousetrap.bind(['/','?'], function() { $('#info').toggle(0); }, 'keydown');

// f key switches between Summary and Failures
Mousetrap.bind(['f','F'], function() { 
  $body.toggleClass('show-failures'); 
}, 'keydown');

// [ and ] keys turn focus mode on and off respectively
Mousetrap.bind('[', function() { App.fold.enableFocus(); }, 'keydown');
Mousetrap.bind(']', function() { App.fold.disableFocus(); }, 'keydown');

// j/s and k/w keys navigate down and up the Summary list in focus mode 
Mousetrap.bind(['j','s','J','S'], function() { App.fold.goDown(); }, 'keydown');
Mousetrap.bind(['k','w','K','W'], function() { App.fold.goUp(); }, 'keydown');

// h/a and l/d fold/unfold currently selected suite in focus mode
Mousetrap.bind(['h','a','H','A'], function() { App.fold.increase(); }, 'keydown');
Mousetrap.bind(['l','d','L','D'], function() { App.fold.decrease(); }, 'keydown');


}());
