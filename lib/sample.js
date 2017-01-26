(function () { "use strict";
// App.Date provides easy ways to work time-less dates. 
// It keeps all dates as 00:00:00.000 UTC.

var re = { // regular expression patterns 
  isoDate: new RegExp("^\\d{4}-\\d\\d-\\d\\d$")
};

// Special date constants
var ASAP =  -85888425600000, // April 21st, 753 BC - Rome founding
    WAITING = 2147472000000, // January 19th, 2038 - Unix 32bit end of the world 
    NO_DATE = 3402172800000; // October 23rd, 2077 - Global nuclear war in Fallout universe 

function addLeadingZero(str) { // construct dd and mm
  str = str + '';
  while (str.length < 2) {
    str = '0' + str;
  }
  return str;
}
function setMonthData(obj, month) {
  switch (month) {
    case 1: obj.mname = 'January'; obj.mlen = 31; break;
    case 2: obj.mname = 'February'; obj.mlen = obj.y % 4 === 0 ? 29 : 28; break;
    case 3: obj.mname = 'March'; obj.mlen = 31; break;
    case 4: obj.mname = 'April'; obj.mlen = 30; break;
    case 5: obj.mname = 'May'; obj.mlen = 31; break;
    case 6: obj.mname = 'June'; obj.mlen = 30; break;
    case 7: obj.mname = 'July'; obj.mlen = 31; break;
    case 8: obj.mname = 'August'; obj.mlen = 31; break;
    case 9: obj.mname = 'September'; obj.mlen = 30; break;
    case 10: obj.mname = 'October'; obj.mlen = 31; break;
    case 11: obj.mname = 'November'; obj.mlen = 30; break;
    case 12: obj.mname = 'December'; obj.mlen = 31; break;
  }
  return obj;
}

App.Date = function (date) {
  if (date && date.isAppDate) return date;
  
  if (!this.isAppDate) {
    throw "Trying to constuct App.Date without a 'new' operator";
  }
  
  if (arguments[1] !== undefined) { // allow (year, month[, day]) calls 
    date = new Date();
    date.setUTCFullYear(arguments[0]);
    date.setUTCMonth(arguments[1] - 1);
    date.setUTCDate(arguments[2] || 1);
  }
  else if (typeof date === 'string') { // allow yyyy-mm-dd strings only 
    switch (date) {
      case 'asap': date = new Date(ASAP); break;
      case 'waiting': date = new Date(WAITING); break;
      case 'no date': date = new Date(NO_DATE); break;
      default:
        if (re.isoDate.test(date)) {
          date = new Date(date + 'T00:00:00.000Z');
        }
        else {
          throw "Invalid date format";
        }
    }
  }
  else { // Use timestamp, Date or current time and grab a local date from it
    var tmpDate;
    if (!date) tmpDate = new Date();
    else if (typeof date === 'number') tmpDate = new Date(date);
    else if (typeof date.getTime === 'function') tmpDate = new Date(date.getTime());
    date = new Date();
    date.setUTCFullYear(tmpDate.getFullYear());
    date.setUTCMonth(tmpDate.getMonth());
    date.setUTCDate(tmpDate.getDate());
  }
  date.setUTCHours(0, 0, 0, 0); // we only deal with dates, no time 
  
  var obj = this;
  
  obj.d = date.getUTCDate();
  obj.dd = addLeadingZero(obj.d);
  obj.m = date.getUTCMonth() + 1;
  obj.mm = addLeadingZero(obj.m);
  obj.yy = date.getUTCFullYear();
  obj.y = (obj.yy + '').substr(2);
  obj.wd = date.getUTCDay();
  obj.stamp = date.getTime();
  
  setMonthData(obj, obj.m);
  
  date.setUTCDate(1);
  obj.firstWeekDay = date.getUTCDay(); // first day of the month 
  obj.monthStart = date.getTime();
  
  date.setUTCDate(0); // add previous month' info  
  obj.prevM = date.getUTCMonth() + 1;
  obj.prevMlen = date.getUTCDate(); // length of the previous month 
  obj.prevYY = date.getUTCFullYear(); // year of the previous month 
  
  date.setUTCMonth(date.getUTCMonth() + 2, 1); // add next month' info
  obj.nextM = date.getUTCMonth() + 1;
  obj.nextYY = date.getUTCFullYear();
  
  date.setTime(obj.stamp); // reset date to original value 
  return obj;
};

App.Date.prototype = { 
  isAppDate: true,
  
  clone: function () { // create a clone of this App.Date 
    return new App.Date(this.yy, this.m, this.d);
  },
  next: function () { // create App.Date for next day 
    return new App.Date(this.yy, this.m, this.d + 1);
  },
  prev: function () { // create App.Date for previous day 
    return new App.Date(this.yy, this.m, this.d - 1);
  },
  shift: function (day, month, year) { // create new App.Date by shifting this one 
    return new App.Date(this.yy + (year || 0), 
                        this.m + (month || 0), this.d + (day || 0));
  },
  
  toISO: function () { // 'yyyy-mm-dd'
    return this.yy +'-'+ this.mm +'-'+ this.dd;
  },
  toString: function (type) {
     switch (this.stamp) {
      case +App.clock.today: return 'Today';
      case +App.clock.yesterday: return 'Yesterday';
      case +App.clock.tomorrow: return 'Tomorrow';
      
      default: return this.toSpecificString(type);
    }
  },
  toSpecificString: function (type) {
    switch (this.stamp) {
      case ASAP: return 'ASAP';
      case WAITING: return 'Waiting';
      case NO_DATE: return 'No Date';
      default: return this.mname.substr(0, 3) + ' ' +
                      this.dd + (type === 'long' ? ', '+ this.yy : '');
    }
  },
  
  valueOf: function () { // return UTC timestamp when converted to a primitive 
    return this.stamp;
  }
};

App.Date.toTimeString = function (input) {
  var date, stamp;
  if (typeof input.getTime === 'function') {
    date = input;
    stamp = date.getTime();
  }
  else if (typeof input === 'string') {
    date = new Date(input);
    stamp = date.getTime();
  }
  else {
    stamp = input;
  }
  
  var diff = Date.now() - stamp,
      result = '';
  
  if (diff > 0 && diff < 210 * 60000) { // return relative time if within past 3.5 hours  
    if (diff < 60000) result = 'moments ago';
    else if (diff < 120000) result = 'a minute ago';
    else if (diff < 60 * 60000) result = Math.floor(diff / 60000) + ' minutes ago';
    else if (diff < 120 * 60000) result = 'an hour ago';
    else if (diff < 180 * 60000) result = 'two hours ago';
    else result = 'three hours ago';
  }
  else { // return date and time 
    date = date || new Date(stamp);
    var c = App.clock,
        day = '';
    if (stamp >= c.localToday && stamp < c.localTomorrow) {
      day = 'today';
    }
    else if (stamp < c.localToday && stamp >= c.localToday - 86400000) {
      day = 'yesterday';
    }
    else if (stamp >= c.localTomorrow && stamp < c.localTomorrow + 86400000) {
      day = 'tomorrow';
    }
    else {
      var month = setMonthData({}, date.getMonth() + 1);
      day = month.mname.substr(0, 3) +' '+ addLeadingZero(date.getDate());
    }
    result = day +' at '+ addLeadingZero(date.getHours()) +':'+ 
                          addLeadingZero(date.getMinutes());
  }
  return result;
};
  
}());
