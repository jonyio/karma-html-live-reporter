(function () { "use strict"; 

var currentLog = -1; // index of a failure log currently displayed in summary
var folded = false;

document.body.onkeypress = function (e) {
  if (!e || !e.keyCode) return;
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 102: toggleFold(); break; // F key
    case 49: showSummary(); break; // 1 key
    case 106: nextLog(); break; // J key
    case 107: previousError(); break; // K key
    case 50: showFailures(); break; // 2 key
  }
};

function offsetTop(el) {
  var top = el.offsetTop;
  while (el = el.offsetParent) {
    top += el.offsetTop;
  }
  return top;
}
function scrollIntoView(el) { // scrolls only if element is not visible
  var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
  var winHeight = window.innerHeight;
  var offset = offsetTop(el);
  if (offset < scrollTop) {
    el.scrollIntoView(true);
  }
  else if (offset + el.clientHeight > scrollTop + winHeight) {
    el.scrollIntoView(false);
  }
}

function showSummary() { document.body.className = "show-summary"; }
function showFailures() { document.body.className = "show-failures"; }

function toggleLog(e, el, state) {
  console.log('toggle log', state);
  var spec = el.nodeName === 'A' ? el.parentNode.parentNode : el;
  
  // it appears that state === undefined is treated as false; that sucks
  if (state !== undefined) spec.classList.toggle('show-log', state);
  else spec.classList.toggle('show-log');
  
  // hide all other logs and record current position 
  var failedSpecs = document.querySelectorAll('.spec.failed');
  for (var i = 0; i < failedSpecs.length; i++) {
    if (failedSpecs[i] !== spec) failedSpecs[i].classList.remove('show-log');
    else currentLog = +i;
  }
  
  if (spec.classList.contains('show-log')) { // scroll and unfold a section 
    if (!e && state === true) { // scroll into view if using J/K keys
      scrollIntoView(spec);
    }
    toggleSection(spec.parentNode, false);
  }
  if (e && e.stopPropagation) e.stopPropagation();
}
function nextLog() {
  currentLog++;
  var failures = document.querySelectorAll('.spec.failed');
  if (!failures.length) return;
  if (currentLog > failures.length - 1) currentLog = 0;
  toggleLog(null, failures[currentLog], true);
}
function previousError() {
  currentLog--;
  var failures = document.querySelectorAll('.spec.failed');
  if (!failures.length) return;
  if (currentLog < 0) currentLog = failures.length - 1;
  toggleLog(null, failures[currentLog], true);
}

function toggleSection(el, state) {
  return;
  if (state !== undefined) el.classList.toggle('folded', state);
  else el.classList.toggle('folded');
  if (!el.classList.contains('folded')) {
    var sections = document.querySelectorAll('section');
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] !== el) sections[i].classList.add('folded');
    }
  }
  
}

function toggleFold() { (folded) ? unfold() : fold(); }
function fold() {
  var sections = document.querySelectorAll('section');
  for (var i = 0; i < sections.length; i++) {
    sections[i].classList.add('folded');
  }
  var openLogs = document.querySelectorAll('.show-log');
  for (i = 0; i < openLogs.length; i++) {
    openLogs[i].classList.remove('show-log');
  }
  currentLog = -1;
  folded = true;
}
function unfold() {
  var sections = document.querySelectorAll('section');
  for (var i = 0; i < sections.length; i++) {
    sections[i].classList.remove('folded');
  }
  folded = false;
}

var socket = new WebSocket("ws://localhost:8476");

}());
