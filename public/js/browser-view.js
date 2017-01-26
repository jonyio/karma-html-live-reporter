(function () { "use strict"; 
var browsers = App.browsers = {}; // App.Browser instances for every browser
var selectedBrowser = null;

var $body = $(document.body);
var $browserTabs = $('#browsers');
var $header = $('header');
var $summary = $('#summary');
var $failures = $('#failures');
var $resultTabs = $('#tabs');

App.socket.on('progress', function (data) { // test progress for a browser 
  if (!browsers[data.browser]) browsers[data.browser] = new App.Browser(data);
  browsers[data.browser].updateProgress(data.progress);
});
App.socket.on('result', function (data) { // a browser's result 
  if (!browsers[data.browser]) browsers[data.browser] = new App.Browser(data);
  browsers[data.browser].updateResult(data);
});
App.socket.on('active_browsers', function (active) { // handle disconnects
  _.each(browsers, function (b, i) {
    if (!active[b.fullName]) {
      b.destroy();
      delete browsers[i];
    }
  });
});

App.Browser = function (P) {
  var self = this;
  
  this.fullName = P.browser;
  this.name = P.browser.replace(/[.,]\d.*$/, '');
  
  this.$tab = $('<div class="browser-tab transition-colors">'+
                  '<span class="browser-status"></span>'+
                  '<span class="browser-name"></span>'+
                '</div>');
  this.$tab.on('click', function () {
    App.haltTransitions(); // change colors immediately 
    self.select();
  });
  $browserTabs.append(this.$tab);
  this.$name = this.$tab.find('.browser-name').html(this.name);
  this.$status = this.$tab.find('.browser-status');
  
  if (!selectedBrowser) this.select();
  
  return this;
};
App.Browser.prototype = {
  
  renderTab: function () {
    this.$status.html(this.failed +'/'+ this.tested);
  },
  renderResults: function () {
    this.$tab.toggleClass('failed', !!this.failed);
    if (!this.selected || !this.resultsHTML) return;
    
    $header.toggleClass('failed', !!this.failed);
    $body.toggleClass('has-failures', !!this.failed);
    
    var total = this.tested < this.total ? this.tested +' of '+ this.total 
                                         : this.total;
                                         
    $header.find('#result-info').html(total+ ' specs tested, '+ 
        this.failed +' failed, '+ this.skipped +' pending');
    
    $header.toggleClass('failed', !!this.failed);
    $resultTabs.toggleClass('hidden', !this.failed); // Summary & Failures links
    
    $summary.html(this.resultsHTML.summary);
    $failures.html(this.resultsHTML.failures || '');
    
    App.fold.update(); // apply current folding to the new HTML 
  },

  select: function () { // display this browser's resutls
    var self = this;
    _.each(App.browsers, function (browser) {
      if (browser !== self) browser.unselect();
    });
    selectedBrowser = this;
    this.selected = true;
    this.$tab.addClass('selected');
    this.renderResults();
  },
  unselect: function () {
    this.selected = false;
    this.$tab.removeClass('selected');
  },

  updateProgress: function (data) { // update the tab
    this.failed = data.failed;
    this.tested = data.tested;
    this.renderTab();
  },
  updateResult: function (data) { // handle new result data 
    var self = this;
    ['passed', 'failed', 'skipped', 'tested', 'total'].forEach(function (key) {
      self[key] = data.progress[key];
    });
    this.resultsHTML = data.resultsHTML;
    this.renderTab();
    this.renderResults();
  },
  
  destroy: function () {
    var self = this;
    this.$tab.addClass('disconnected');
    // this.$name.html('Disconnected');
    this.$status.html('');
    this.$tab.animate({ width: 0, opacity: 0 }, { complete: function () {
      self.$tab.remove();
    }});
    
    if (this.selected) { // select first of remaining browser tabs 
      // Mousetrap.trigger('1');
      selectedBrowser = null;
      $('#browsers .browser-tab').not('.disconnected').first().trigger('click');
      // $body.trigger($.Event( "keypress", { keyCode: 49 } ));
    }
  },
};

}());

