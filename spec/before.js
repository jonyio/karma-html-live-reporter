(function () { "use strict"; 
  
window.io = new EventEmitter();
io.connect = function () {
  return new EventEmitter();
};
sinon.spy(io, 'connect');

$(document.body).append('<div id="browsers"></div>');
$(document.body).append('<div id="summary"><section></section></div>');

}());

