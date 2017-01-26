"use strict";

var _ = require('lodash');
var jade = require('jade');
var path = require('path');
var hash = require('string-hash');


var tpl = {
  summary: jade.compileFile(path.resolve(__dirname, '../tpl/summary.jade')),
  failures: jade.compileFile(path.resolve(__dirname, '../tpl/failures.jade')),
};

var hashes = {}; // cache of hashed strings 
function getHash(str) { // generate hash or get from cache 
  return hashes[str] || (hashes[str] = hash(str));
}

function Browser(browser, io) {
  this.name = browser.name;
  this.io = io;
  this.emitProgress = _.throttle(this.emitProgress, 15);
}

Browser.prototype = {
  
reset: function (data) { // reset data before another run
  this.failedSpecs = []; // failed specs for Failurs tab 
  
  this.suiteByID = {}; // global list of all suites and sub-suites by ID
  this.suites = []; // list of top-level suites 
  
  this.total = {
    total: data.lastResult.total, // total specs in the tests 
    tested: 0, // total specs processed considering ddescribe and iit
    failed: 0,
    skipped: 0, // pending specs ('xit' or without testing code)
    passed: 0,
  };
  this.pseudoSuite = false; // suite for lone specs 
},
  
emitProgress: function (socket) {
  socket = socket || this.io;
  socket.emit('progress', {
    browser: this.name,
    progress: {
      failed: this.total.failed,
      tested: this.total.tested,
    },
  });
},
emitResult: function (socket) {
  socket = socket || this.io;
  socket.emit('result', {
    browser: this.name,
    progress: this.total,
    resultsHTML: this.resultsHTML,
  });
},

processSpec: function (spec) { // process single spec's test result 
  var suite = this.getSuite(spec.suite);
  var fullName = spec.suite.join(' ') +' '+ spec.description;
  var res = spec.skipped ? 'skipped' : spec.success ? 'passed' : 'failed';
  var log = spec.log.length && spec.log.join('\n\n') // beautify the log a bit
                .replace(/http:\/\/localhost:\d+\/base\//gi, '')
                .replace(/\?[\da-z]{40}/g, '');
  
  suite.push({
    result: res,
    name: spec.description,
    id: getHash(fullName),
    log: log,
  });
  
  this.total.tested++;
  this.total[res]++;
  suite.root.total[res]++;
  
  if (res === 'failed') { // save for the Failures tab 
    suite.root.state = 'failed';
    this.failedSpecs.push({
      name: fullName,
      log: log,
    });
  }
  
  this.emitProgress();
},

generateSuite: function (path) { // creates a suite for a description path
  var suite = _.extend([], {
    isSuite: true, // to differentiate from a spec 
    isRoot: path.length === 1, // a top-level foldable suite 
    name: path[path.length - 1], 
    id: getHash(path.join('')),
    state: 'passed',
    total: {
      passed: 0,
      failed: 0,
      skipped: 0,
    },
  });
  suite.root = suite.isRoot ? suite : this.suiteByID[ getHash(path[0]) ];
  this.suiteByID[suite.id] = suite;
  return suite;
},
getSuite: function (path) { // gets or creates a suite, + its parents if needed
  if (!path.length) { // all lone specs go into a single pseudo suite 
    return this.pseudoSuite || (this.pseudoSuite = this.generateSuite(['...']));
  }
  
  // find a suite with partially or fully matching path 
  var parent;
  var i = path.length + 1;
  while (!parent && --i > 0) {
    parent = this.suiteByID[ getHash( _.first(path, i).join('') ) ];
  }
  if (i === path.length) return parent; // full match - the suite already exists
  if (!parent) parent = this.suites; // no match - start from the top level 
  
  var newSuite;
  while (i < path.length) { // add all necessary new suites down the branch
    newSuite = this.generateSuite(_.first(path, i+1));
    parent.push(newSuite);
    parent = newSuite;
    i++;
  }
  
  return newSuite;
},

completeRun: function () { // render and emit results 
  if (this.pseudoSuite) this.suites.unshift(this.pseudoSuite);
  
  var failed = !!this.failedSpecs.length;
  this.resultsHTML = {
    summary: tpl.summary(this),
    failures: failed && tpl.failures(this),
  };
  
  this.emitResult();
},
  
};

module.exports = Browser;
