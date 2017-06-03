"use strict"; 

var _ = require('lodash');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var jade = require('pug');
var lessMiddleware = require('less-middleware');

var Browser = require('./lib/browser.js');
var browsers = {}; // list of Browser objects for every connected browser 

var reporter = function (decorator, karmaConfig, emitter, logger) {

  var config = karmaConfig.htmlLiveReporter || {};
  config.port = config.port || 5060;
  config.pageTitle = config.pageTitle || 'Karma';
  config.defaultTab = config.defaultTab || 'summary';
  config.colorScheme = config.colorScheme ? config.colorScheme.toLowerCase() 
                                          : 'jasmine';
  config.focusMode = !!config.focusMode;


  var indexHTML = jade.renderFile(__dirname +'/tpl/index.jade', config);

  logger = logger.create('reporter.html'); // karma's console.log 

  decorator(this);
  var allMessages = []; // no idea what's this doing here really
  this.adapters = [function (msg) { allMessages.push(msg); }];
  // this.onRunStart = function () { allMessages = []; };

  app.get('/', function (req, res) { res.send(indexHTML); });
  app.get('/lodash.min.js', function (req, res) {
    res.sendfile(require.resolve('lodash/dist/lodash.min.js'));
  });
  app.get('/jquery.min.js', function (req, res) {
    res.sendfile(require.resolve('jquery/dist/jquery.min.js'));
  });
  app.use(lessMiddleware(__dirname + '/public/css'));
  app.use(express.static(__dirname + '/public/css'));
  app.use(express.static(__dirname + '/public/js'));
  app.use(express.static(__dirname + '/public/img'));

  server.listen(config.port);
  logger.info('Live HTML reports available at localhost:'+ config.port);

  io.on('connection', function (socket) { // emit config and current results 
    socket.emit('config', config);
    _.each(browsers, function (browser) {
      browser.emitResult(socket);
    });
  });
  
  this.onRunStart = function () {
    allMessages = [];
    this._activeBrowsers = {};
  };

  this.onBrowserStart = function (browser) { // reset browser data 
    // console.log('disconnected: '+ browser.lastResult.disconnected);
    // console.log(JSON.stringify(browser, null, 4));
    // console.log(browser.id + ' - ' + browser.name);
    
    if (!browsers[browser.id]) {
      
      // ignore same browsers previously connected 
      _.each(browsers, function (b, i) {
        if (b.name === browser.name) delete browsers[i];
      });
      
      browsers[browser.id] = new Browser(browser, io);
    }
    browsers[browser.id].reset(browser);
    // startTime: process.hrtime(),
  };

  this.onSpecComplete = function (browser, result) { // process a spec
    if (browsers[browser.id]) browsers[browser.id].processSpec(result);
  };
  
  this.onBrowserComplete = function(browser) {
    if (!browsers[browser.id]) return;
    this._activeBrowsers[browser.name] = true;
    // console.log(JSON.stringify(browser.lastResult, null, 4));
    browsers[browser.id].completeRun();
  };

  this.onRunComplete = function() {
    var self = this;
    io.emit('active_browsers', this._activeBrowsers);
    _.each(browsers, function (b, i) { // remove disconnected browsers 
      if (!self._activeBrowsers[b.name]) delete browsers[i];
    });
  };

  emitter.on('exit', function (done) { // shut down the reporter server
    if (server) server.close();
    done();
  });

}; // reporter

reporter.$inject = ['baseReporterDecorator', 'config', 
                    'emitter', 'logger', 'helper'];

module.exports = { 'reporter:live-html' : ['type', reporter] };

