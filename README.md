# Karma Live HTML Reporter

Reporter that displays your test results in a live-updated html page.

![gif demo][demo]

[demo]: https://github.com/jonyio/karma-html-live-reporter/raw/master/demo.gif


## Installation

```bash
npm install karma-html-live-reporter --save-dev
```

Add `live-html` to your list of reporters in karma.conf.js

## Configuration

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'live-html'],

    // the default configuration
    htmlLiveReporter: {
      colorScheme: 'jasmine', // light 'jasmine' or dark 'earthborn' scheme
      defaultTab: 'summary', // 'summary' or 'failures': a tab to start with
      
      // only show one suite and fail log at a time, with keyboard navigation
      focusMode: true, 
    },
  });
};
```

You can pass list of reporters as a CLI argument too:
```bash
karma start --reporters html,dots
```

## Keyboard Controls

* `1` and `2` - switch between Spec List and Failures.
* `F` - fold/unfold all suites in `preserveDescribeNesting` mode.
* `[` - toggle focus mode on.
* `]` - toggle focus mode off.
* `/` or `?` - show/hide help.

* `WASD` or `HJKL` - navigation in focus mode

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
