exports.getCurrentTime = function(expo=true, dash=true) {
    let now_date = new Date();
    let year = now_date.getFullYear();
    let month = now_date.getMonth() + 1;
    let day = now_date.getDate();
    let hour = now_date.getHours();
    let minute = now_date.getMinutes();
    let second = now_date.getSeconds();
    month = month < 10 ? '0'+month : month;
    day = day < 10 ? '0'+day : day;
    hour = hour < 10 ? '0'+hour : hour;
    minute = minute < 10 ? '0'+minute : minute;
    second = second < 10 ? '0'+second : second;
    let date_time = '';
    if(dash) {
      date_time = expo ? (year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second) : (year+"-"+month+"-"+day);
    }
    else {
      date_time = expo ? (year+"년"+month+"월"+day+"일 "+hour+"시 "+minute+"분 "+second+"초") : (year+"년"+month+"월"+day+"일");
    }
    return date_time;
};

exports.getCurrentTime1 = function(all=false) {
    let now_date = new Date();
    let year = now_date.getFullYear();
    let month = now_date.getMonth() + 1;
    let day = now_date.getDate();    
    month = month < 10 ? '0'+month : month;
    day = day < 10 ? '0'+day : day;    
    let date = year+"년 "+month+"월 "+day+"일";
    return date;
};
exports.getYearMonth = function() {
    let now_date = new Date();
    let year = now_date.getFullYear();
    let month = now_date.getMonth() + 1;
    month = month < 10 ? '0'+month : month;
    return year+"-"+month;
};

exports.getCorrectDate = function(str_date) {
    let now_date = new Date(str_date);
    let year = now_date.getFullYear();
    let month = now_date.getMonth() + 1;
    let day = now_date.getDate();    
    month = month < 10 ? '0'+month : month;
    day = day < 10 ? '0'+day : day;    
    let date = year+"-"+month+"-"+day;
    return date;
};

exports.getCorrectDay = function(str_date) {
    let now_date = new Date(str_date);    
    let day = now_date.getDate();    
    return day;
};

exports.getCorrectTime = function(str_date, type='dash') {
    let now_date = new Date(str_date);
    let year = now_date.getFullYear();
    let month = now_date.getMonth() + 1;
    let day = now_date.getDate();
    let hour = now_date.getHours();
    let minute = now_date.getMinutes();
    let second = now_date.getSeconds();
    month = month < 10 ? '0'+month : month;
    day = day < 10 ? '0'+day : day;
    hour = hour < 10 ? '0'+hour : hour;
    minute = minute < 10 ? '0'+minute : minute;
    second = second < 10 ? '0'+second : second;
    let date_time1 = year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second;
    let date_time2 = year+"년 "+month+"월 "+day+"일 "+hour+"시 "+minute+"분";
    return type == 'dash' ? date_time1 : date_time2;
};

exports.getFormatTime = function(str_date) {
  let now_date = new Date(str_date);
  let year = now_date.getFullYear();
  let month = now_date.getMonth() + 1;
  let day = now_date.getDate();
  let hour = now_date.getHours();
  let minute = now_date.getMinutes();
  let second = now_date.getSeconds();
  month = month < 10 ? '0'+month : month;
  day = day < 10 ? '0'+day : day;
  hour = hour < 10 ? '0'+hour : hour;
  minute = minute < 10 ? '0'+minute : minute;
  second = second < 10 ? '0'+second : second;
  let date_time = (year+"년 "+month+"월 "+day+"일 "+hour+"시 "+minute+"분");
  return date_time;
};

exports.getFilePath = function() {
  let now_date = new Date();
  let year = now_date.getFullYear()+'';
  let month = now_date.getMonth() + 1;
  month = month < 10 ? '0'+month : month;
  return year+''+month;
};

exports.getYMD = function() {
  let now_date = new Date();
  let year = now_date.getFullYear();
  let month = now_date.getMonth() + 1;
  let day = now_date.getDate();
  month = month < 10 ? '0'+month : month;
  day = day < 10 ? '0'+day : day;
  
  return year+""+month+""+day;
};

exports.getDateOffsetDays = function(offset=1) {    // today and add days
  var today = new Date();
  var todayYear = today.getFullYear();
  if(offset > 0 && offset < 30) 
    var lastday = new Date(todayYear,today.getMonth(),today.getDate()+offset);
  else 
    var lastday = new Date(todayYear, today.getMonth()-Math.ceil(offset/30), today.getDate());

  return {
    firstday: exports.getCorrectDate(today), 
    lastday: exports.getCorrectDate(lastday)
  };
};

exports.getWeekDays = function(offset=0) {    // 0: this week days, 7: next week days
  let today = new Date; // get current date
  let first = today.getDate() - today.getDay() + 1 + offset; // First day is the day of the month - the day of the week
  let last = first + 6; // last day is the first day + 6
  
  let firstday = new Date(today.setDate(first));
  let lastday = new Date(today.setDate(last));

  return {
    firstday: exports.getCorrectDate(firstday), 
    lastday: exports.getCorrectDate(lastday)
  };
};

exports.getThisMonthDays = function() {
  let date = new Date();
  let firstday = new Date(date.getFullYear(), date.getMonth(), 1);
  let lastday = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    firstday: exports.getCorrectDate(firstday), 
    lastday: exports.getCorrectDate(lastday)
  };
};
exports.relativeTime = function(date) {
  if(!Boolean(date)) return  '';
  let time = new Date(date).getTime();
  let diff = (new Date().getTime() - time) / 1000;

  if(diff == 0)
    return '방금';
  else if(diff > 0)
  {
    let date_diff = Math.floor(diff / 86400);
    if(date_diff == 0)
    {
      if(diff < 60) return '방금전';
      if(diff < 120) return '1분전';
      if(diff < 3600) return Math.floor(diff / 60) + ' 분전';
      if(diff < 7200) return '1시간전';
      if(diff < 86400) return Math.floor(diff / 3600) + ' 시간전';
    }
    return formatDate1(date);
  }
};
exports.getDiffTime = function(minute) {    
    let diffTime = "";

    if(minute < 60)
        diffTime = minute+"분";
    else if(minute < 60*24)
        diffTime = Math.floor(minute/60)+"시간 ";
    else if(minute < 60*24*366)
        diffTime = Math.floor(minute/60/24)+"일";
    else
        diffTime = Math.floor(minute/60/24/365)+"년";
    
    return diffTime;
};
exports.RelativeEndTime = function(day, limit_time) {
  if(!day || !limit_time) return '';
  let future     = new Date().getTime() / 1000; //Future date.
  let timefromdb = new Date(day).getTime() / 1000; //source time
  let timeleft   = future-timefromdb;
  let daysleft   = Math.round(((timeleft/24)/60)/60); 
  
  if(parseInt(daysleft) >= limit_time) {
      return '마감';
  }
  else {
    return (Math.abs(daysleft-limit_time));
  }
};
//
exports.getSubTwoDay = function(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
};

exports.changeIntegerAge = function(birthday) {    // birthday = "750127"       // 만나이
  let y=parseInt(birthday.substring(0,1));
  let preYear = (y === 2) ? 20 : 19;
  birthday = preYear + birthday;

  let now_date = new Date();
  let year = now_date.getFullYear();
  let month = now_date.getMonth() + 1;
  let day = now_date.getDate();
  month = month < 10 ? '0'+month : month;
  day = day < 10 ? '0'+day : day;
  let now = year+""+month+""+day;

  let offset = parseInt(now) - parseInt(birthday) + '';
  return offset.length === 5 ? '0'+offset : offset;
};

exports.formatNum = function(number) {
  number = number + '';
  let formatNum = number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return formatNum;
};
//
exports.getRandNumber = function (max, min) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// add time
exports.addMinutes = function(add_minutes) {
  let now = new Date();
  now.setMinutes(now.getMinutes() + add_minutes);
  now_date = new Date(now); // Date object

  let year = now_date.getFullYear();
  let month = now_date.getMonth() + 1;
  let day = now_date.getDate();
  let hour = now_date.getHours();
  let minute = now_date.getMinutes();
  let second = now_date.getSeconds();
  month = month < 10 ? '0'+month : month;
  day = day < 10 ? '0'+day : day;
  hour = hour < 10 ? '0'+hour : hour;
  minute = minute < 10 ? '0'+minute : minute;
  second = second < 10 ? '0'+second : second;
  let date_time = year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second;
  return date_time;
};
exports.createOid = function() {
  
  const now_date = new Date();
  const now_year = now_date.getFullYear();
  let now_month = now_date.getMonth() + 1;
  let now_day = now_date.getDate();
  now_month = (now_month < 10) ? '0' + now_month : now_month;
  now_day = (now_day < 10) ? '0' + now_day : now_day;
  return 'greenlight_' + now_year + now_month + now_day + now_date.getTime();
  
};
exports.generateRandom = function(min, max) {
  var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
  return ranNum;
}
exports.removeSpecials = function(str) {
  
  return !str ? '' : str?.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
    ?.replace(/【/gi, '')
    ?.replace(/】/gi, '')
    ?.replace(/(?![*#0-9]+)[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '') // remove emoji
    ?.replace(/[/]/g, '-')?.replace(/ /gi, '-') || '';
}

