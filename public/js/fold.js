// Folding of top-level suites (sections) 
(function () { "use strict";

var $summary = $('#summary');
var $focusStatus = $('#focus-status');

$focusStatus.on('click', function () {
  App.fold.focusMode ? App.fold.disableFocus() : App.fold.enableFocus();
});
$summary.on('click', '.section-toggle', function (e) {
  App.fold.toggleSuite($(e.target).closest('section'));
  return false;
});
$('#summary').on('click', '.summary-failure-toggle', function (e) {
  App.fold.toggleLog($(e.target).closest('.spec'));
  return false;
});


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
    el.scrollIntoView(false);
  }
  else if (offset + el.clientHeight > scrollTop + winHeight) {
    el.scrollIntoView(false);
  }
}

App.fold = {
  focusMode: true, // whether folding is turned on 
  unfold: 'one', // what to auto-unfold 
  forcedStates: {},  // currently forced fold states 
  selectedSuiteID: null,
  selectedSpecID: null,
  
  disableFocus: function () {
    $focusStatus.html('Focus Mode Off');
    if (!this.focusMode) return;
    this.focusMode = false;
    this.selectedSuiteID = this.selectedSuiteID = null;
    $(document.body).addClass('no-focus');
    $summary.find('section').removeClass('folded');
    $summary.find('.spec').removeClass('show-log');
    this.update();
  },
  enableFocus: function () {
    $focusStatus.html('Focus Mode On');
    if (this.focusMode) return;
    this.focusMode = true;
    $(document.body).removeClass('no-focus');
    if (this.selectedSpecID) {
      var $spec = $summary.find('#'+ this.selectedSpecID);
      if ($spec.length) {
        this.selectedSuiteID = $spec.closest('section')[0].id;
      }
    }
    this.update();
  },
  
  increase: function () { // increase focus-folding level
    this.unfold = 'none';
    // this.forcedStates = {};
    this.update();
  },
  decrease: function () { // decrease focus-folding level
    this.unfold = 'one';
    // this.forcedStates = {};
    this.update();
  },
  
  update: function () { // update DOM 
    var self = this;
    var $selectedSuite = this.selectedSuiteID && $('#'+ this.selectedSuiteID);
    var $selectedSpec = this.selectedSpecID && $('#'+ this.selectedSpecID);
    var $sections = $summary.find('section');
    if (!$sections.length) return;
    if ($sections.length === 1) this.unfold = 'one';
    if (this.focusMode) {
      $(document.body).toggleClass('no-focus', $sections.length === 1);
    }
    
    if (!$selectedSuite || !$selectedSuite.length) {
      $selectedSuite = $('section.failed').first();
      if (!$selectedSuite.length) $selectedSuite = $('section').first();
      this.selectedSuiteID = $selectedSuite[0].id;
    }
    
    if (this.focusMode && (!$selectedSpec || !$selectedSpec.length || 
        !$selectedSpec.hasClass('failed') || 
        !$.contains($selectedSuite[0], $selectedSpec[0]))) {
      
      if ($selectedSuite.hasClass('failed')) {
        $selectedSpec = $selectedSuite.find('.spec.failed').first();
        this.selectedSpecID = $selectedSpec[0].id;
      }
      else {
        $selectedSpec = null;
        this.selectedSpecID = null;
      }
    }
    
    if (!this.focusMode) $sections.removeClass('folded');
    else $sections.each(function (i, el) {
      // if (self.forcedStates[el.id]) {
      //   el.classList.toggle('folded', self.forcedStates[el.id] === 'folded');
      // }
      // else {
      el.classList.toggle('folded', self.unfold === 'none' || 
          self.unfold === 'one' && el !== $selectedSuite[0]);
      // }
    });
    
    $summary.find('.spec, section').removeClass('selected');
    if (this.focusMode) $selectedSuite.addClass('selected');
    if ($selectedSpec) {
      $selectedSpec.addClass('selected');
      scrollIntoView($selectedSpec[0]);
    }
    else {
      scrollIntoView($selectedSuite[0]);
    }
  },
  
  toggleSuite: function ($suite) {
    if (!this.focusMode) {
      $suite.toggleClass('folded');
      if (!$suite.hasClass('folded')) this.selectedSuiteID = $suite[0].id;
    }
    else {
      if (this.selectedSuiteID === $suite[0].id) {
        this.unfold = this.unfold === 'one' ? 'none' : 'one';
      }
      else {
        this.selectedSuiteID = $suite[0].id;
        if (this.unfold === 'none') this.unfold = 'one';
      }
      this.update();
    }
  },
  
  toggleLog: function ($spec) {
    $spec.toggleClass('selected');
    
    if ($spec.hasClass('selected')) { // scroll and unfold a section 
      this.selectedSpecID = $spec[0].id;
    }
    else if (this.selectedSpecID === $spec[0].id) {
      this.selectedSpecID = null;
    }
    if (this.focusMode) this.update();
  },
  
  go: function (dir) { // go down or up 
    if (!this.focusMode) return this;
    var jumpSuite = dir === 'down' ? 'nextSuite' : 'prevSuite';
    var sibling = dir === 'down' ? 'nextAll' : 'prevAll';
    
    if (this.unfold === 'none' || !this.selectedSpecID) {
      return this[jumpSuite]();
    }
    
    if (this.selectedSpecID) { // try next failure log in current suite 
      var $spec = $summary.find('#'+ this.selectedSpecID)[sibling]('.failed');
      if ($spec.length) {
        this.selectedSpecID = $spec[0].id;
        this.update();
      }
      else this[jumpSuite]();
    }
    
    return this;
  },
  goDown: function () { return this.go('down'); },
  goUp: function () { return this.go('up'); },
  
  nextSuite: function () { // jump to next suite 
    if (!this.focusMode) return this;
    var $suite = $summary.find('#'+ this.selectedSuiteID).next();
    if (!$suite.length) $suite = $summary.find('section').first();
    this.selectedSuiteID = $suite[0].id;
    this.update();
    return this;
  },
  prevSuite: function () { // jump to previours suite 
    if (!this.focusMode) return this;
    var $suite = $summary.find('#'+ this.selectedSuiteID).prev();
    if (!$suite.length) $suite = $summary.find('section').last();
    this.selectedSuiteID = $suite[0].id;
    this.update();
    return this;
  },

};

}());
