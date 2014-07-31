(function () { "use strict"; 
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var mu = require('mu2');
// var http = require('http');
// var Server = require('ws').Server;
var reporter = function (decorator, karmaConfig, emitter, logger, helper) {
    

var config = karmaConfig.htmlLiveReporter || {};

config.dir = path.resolve(karmaConfig.basePath, config.dir || 'spec_html');
config.templatePath = config.templatePath ? path.resolve(karmaConfig.basePath, 
                                                         config.templatePath) 
                                          : __dirname +'/jasmine.tpl.html';

logger = logger.create('reporter.html'); // karma's console.log 

var browsers = {}; // all data for each browser is collected here 
var filesToWrite = 0; // write streams in progress 
var finish = function () {}; // used when karma stopped but writes still haven't

function isEqual(current, next) { // simple array comparison for suite names
  if (current.length !== next.length) return false;
  for (var i= 0, l= current.length; i < l; i++) {
    if (current[i] !== next[i]) return false;
  }
  return true;
}


decorator(this);
// var allMessages = []; // no idea what's this doing here really
// this.adapters = [function (msg) { allMessages.push(msg); }];
// this.onRunStart = function () { allMessages = []; };

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/css.css', function (req, res) {
  res.sendfile(__dirname + '/css.css');
});
app.get('/js.js', function (req, res) {
  res.sendfile(__dirname + '/js.js');
});

server.listen(5060);
console.log('Live HTML reports available at localhost:5060');

// var wss = new Server({ port: 8476 });
// wss.on('connection', function(ws) {
//   console.log('connected');
//   ws.on('message', function(message) {
//     console.log('received: %s', message);
//   });
//   ws.send('something');
// });


this.onBrowserStart = function (browser) { // reset browser data 
  browsers[browser.id] = {
    failedSpecs: [],
    foldAll: !!config.foldAll,
    name: browser.name,
    startTime: process.hrtime(),
    suites: [], // list of top-level suites 
    curSuiteName: [], // current set of suite names as an array of strings
    curIndent: 0, // in 'levels'
    suiteIndex: -1, // current top-level suite in processing 
    total: {
      tested: 0, // specs processed 
      failed: 0,
      skipped: 0,
      success: 0,
    },
  };
};


// this.specSuccess = 
// this.specSkipped = 
// this.specFailure = 
this.onSpecComplete = function (browser, result) { // process a spec
  
  var b = browsers[browser.id];
  
  var lastIndent = b.curIndent;
  var describeAdded = false; // whether new `describe` line was added
  var suite = b.suites[b.suiteIndex];
  
  // combined suite-name changed or doesn't exist (like an 'iit' spec)
  if (!result.suite || !isEqual(b.curSuiteName, result.suite)) {
    b.curIndent += result.suite.length - b.curSuiteName.length - 1;
    
    if (!result.suite || result.suite.length > b.curSuiteName.length ||
        !isEqual(_.first(b.curSuiteName, result.suite.length), result.suite)) {
      
      if (!b.curIndent) { // opening a new section 
        b.suiteIndex++;
        suite = b.suites[b.suiteIndex] = { 
          lines: [], passed: 0, skipped: 0, failed: 0, 
          folded: config.foldAll ? 'folded' : '',
        };
      }
      
      suite.lines.push({ // add `describe` line
        className: 'description'+ (!b.curIndent ? ' section-starter' : ' br'),
        indent: b.curIndent * 14,
        style: 'padding-left:'+ (b.curIndent * 14) + 'px',
        text: result.suite ? result.suite[b.curIndent] : 'Anonymous Suite',
        failed: false,
      });
      describeAdded = true;
    }
    b.curSuiteName = result.suite;
    b.curIndent++;
  }
  
  var res = result.success ? 'passed' : result.skipped ? 'skipped' : 'failed';
  var log = result.log.length && result.log.join('\n\n')
                .replace(/http:\/\/localhost:\d+\/base\//gi, '')
                .replace(/\?[\da-z]{40}/g, '');
  suite.lines.push({ // add spec line 
    className: 'spec '+ res +
               (b.curIndent < lastIndent && !describeAdded ? ' br' : ''),
    indent: b.curIndent * 14,
    logIndent: b.curIndent * 14 + 24,
    style: 'padding-left:'+ (b.curIndent * 14) + 'px',
    text: result.description,
    failed: res === 'failed',
    log: log,
  });
  
  b.total.tested++;
  b.total[res]++;
  suite[res]++;
  if (res === 'failed') { // save for the Failures tab 
    b.failedSpecs.push({
      name: result.suite.join(' ') +' '+ result.description,
      log: log,
    });
  }
};

// console.log(JSON.stringify(browser, null, 4));


this.onBrowserComplete = function(browser) {
  // var results = browser.lastResult;
  var b = browsers[browser.id];
  
  // generate section (root level suites) totals 
  var k = ['passed', 'failed', 'skipped'], i, n;  
  for (i = 0; i < b.suites.length; i++) {
    b.suites[i].lines[0].totals = [];
    for (n = 0; n < k.length; n++) { // add non-zero totals to the root line
      if (b.suites[i][ k[n] ]) b.suites[i].lines[0].totals.push({
        result: k[n],
        count: b.suites[i][ k[n] ],
      });
    }
  }
  
  // indicate that ddescribe or iit was used
  if (b.total.tested < browser.lastResult.total) {
    b.total.tested = b.total.tested +' of '+ browser.lastResult.total;
  }
  b.result = b.total.failed ? 'failed' : b.total.passed ? 'passed': 'pending';
  
  
  // whether to select the Failures tab automatically 
  b.focusOnFailures = config.focusOnFailures !== false && b.total.failed;
  
  b.pageTitle = config.pageTitle || b.name; // inject into head 
  b.date = new Date().toDateString();
  
  var template = mu.compileAndRender(config.templatePath, b);
  template.pause();
  
  var writeStream;
  var reportPath = config.dir +'/'+ b.name.replace(/\s+/g, '_') +'.html';
  
  helper.mkdirIfNotExists(path.dirname(reportPath), function() {

    writeStream = fs.createWriteStream(reportPath, function(err) {
      if (err) {
        logger.warn('Cannot write HTML Report\n\t' + err.message);
      } else {
        logger.debug('HTML report written to "%s".', reportPath);
      }
    });

    template.pipe(writeStream);
    template.resume();

    writeStream.on('finish', function() {
      if (!--filesToWrite) {
        finish();
      }
      template = null;
    });
  });
};


function prepareResults(browser) {
  browser.foldAll = (!!config.foldAll).toString(); // pass var to the template 
  if (config.preserveDescribeNesting && browser.suites) { // generate section totals 
    var k = ['passed', 'failed', 'skipped'], i, n;  
    for (i = 0; i < browser.suites.length; i++) {
      browser.suites[i].lines[0].totals = [];
      for (n = 0; n < k.length; n++) {
        if (browser.suites[i][ k[n] ]) browser.suites[i].lines[0].totals.push({
          result: k[n],
          count: browser.suites[i][ k[n] ],
        });
      }
    }
  }
  
  browser.suites = suitesToArray(browser.suites);
  var results = browser.results;
  results.hasSuccess = results.success > 0;
  results.hasFailed = results.failed > 0;
  results.hasSkipped = results.skipped > 0;
  browser.failedSuites = getFailedSuites(browser.suites);
  return browser;
}

function suitesToArray(suites) {
  return _.map(suites, function(suite, suiteName) {
    var specs = transformSpecs(suite.specs);
    var overallState = getOverallState(specs);
    return { name : suiteName, state : overallState, specs : transformSpecs(suite.specs)};
  });
}

function transformSpecs(specs) {
  return _.map(specs, function(spec) {
    var newSpec = _.clone(spec);
    if (spec.skipped) {
      newSpec.state = "skipped";
    }
    else if (spec.success) {
      newSpec.state = "passed";
    }
    else {
      newSpec.state = "failed";
    }
    return newSpec;
  });
}

function getOverallState(specs) {
  if (_.any(specs, function(spec) {
    return spec.state === "failed";
  })) {
    return "failed";
  }
  else {
    return "passed";
  }
}

function getFailedSuites(suites) {
  return _.filter(suites,function(suite) {
    return suite.state === "failed";
  }).map(function(suite) {
     var newSuite = _.clone(suite);
     newSuite.specs = getFailedSpecs(suite.specs);
     return newSuite;
   });
}

function getFailedSpecs(specs) {
  return _.filter(specs, function(spec) {
    return spec.state === "failed";
  });
}


this.onRunComplete = function(browsers) {
  
  // filesToWrite = browsers.length;
  // browsers.forEach(function(browser) {
  //   var results = browsers[browser.id];

  //   prepareResults(results);
    
  //   // whether report name should go into file name istead of a folder
  //   var namedFiles = config.namedFiles || false;
    
  //   // whether to select the Failures tab automatically 
  //   results.focusOnFailures = config.focusOnFailures !== false && results.results.hasFailed;
    
  //   var outputDir = config.outputDir || 'karma_html';
  //   var reportName = config.reportName || config.middlePathDir || results.browserName;
  //   results.pageTitle = config.pageTitle || reportName; // inject into head 
  //   if (config.urlFriendlyName) reportName = reportName.replace(/ /g, '_');
  //   var reportFile = outputDir + '/' + reportName + (namedFiles ? '.html' : '/index.html');
  //   var writeStream;
    
  //   results.date = new Date().toDateString();
    
  //   var templatePath = config.templatePath || __dirname + "/jasmine_template.html";
  //   var template = mu.compileAndRender(templatePath, results);
  //   template.pause();
    
  //   helper.mkdirIfNotExists(path.dirname(reportFile), function() {

  //     writeStream = fs.createWriteStream(reportFile, function(err) {
  //       if (err) {
  //         logger.warn('Cannot write HTML Report\n\t' + err.message);
  //       } else {
  //         logger.debug('HTML report written to "%s".', reportFile);
  //       }
  //     });

  //     writeStream.on('finish', function() {
  //       if (!--filesToWrite) {
  //         finish();
  //       }
  //       template = null;
  //     });

  //     template.pipe(writeStream);
  //     template.resume();
  //   });

  // });
};

emitter.on('exit', function(done) { // wait for writes to finish before exiting
  console.log('emitter exited');
  if (server) try { server.close(); } catch (e) {}
  // if (wss) wss.close();
  if (filesToWrite) finish = done;
  else done();
});




}; // reporter

reporter.$inject = ['baseReporterDecorator', 'config', 
                    'emitter', 'logger', 'helper'];

module.exports = { 'reporter:live-html' : ['type', reporter] };

}());
