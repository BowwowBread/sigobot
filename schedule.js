/**
 * Created by bowwow on 2017. 7. 1..
 */

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const stringSimilarity = require('string-similarity');
const cheerio = require('cheerio');
const schedule = require('node-schedule');


var schoolCafeteria = function (callback, todayState) {
  
  // 현재 날짜
  var time = new Date();
  var timeNow = time.getFullYear() + '' + ("0" + (time.getMonth() + 1)).slice(-2); // 결과 201701
  var hour = time.getHours();
  if (hour >= 9) {
    if (todayState) {
      var timeDay = time.getDate() + 1;
    } else {
      var timeDay = time.getDate() + 2;
    }
  } else {
    if (todayState) {
      var timeDay = time.getDate();
    } else {
      var timeDay = time.getDate() + 1;
    }
  }
  var url = "http://stu.sen.go.kr/sts_sci_md00_001.do?schulCode=B100000599&schulCrseScCode=4&schulKndScCode=04&schMmealScCode=2&schYm={{date}}&";
  var modernUrl = url.replace('{{date}}', timeNow);
  
  request(modernUrl, function (err, res, body) {
    if (err) return callback(err);
    
    /**
     * !! Cheerio 모듈 0.12.0 버전에서 깨짐없이 나옴 !!
     */
    var $ = cheerio.load(body);
    var elements = $("tbody td");
    
    // 엘리멘트 내에 td 순회
    elements.each(function () {
      
      // 데이터가 존재하지 않을 시 가져오지 못함
      var postDiv = $(this).find("div").html();
      if (postDiv == null) {
        callback("나이스 서버 오류 입니다.");
      }
      // 해당 날짜 급식을 배열로 변환
      var postArray = postDiv.split("<br>");
      
      var result = "";
      if (postArray[0] == timeDay) {
        if (postArray.length <= 1) {
          callback("급식을 먹는날이 아닙니다");
        } else {
          for (var i = 0; i < postArray.length; i++) {
            result = result + postArray[i] + '\n';
          }
          callback(result);
        }
      }
    });
  });
};

// 학교 일정
var schoolSchedule = function (callback, schduleState) {
  
  var time = new Date();
  var timeYear = time.getFullYear();
  var timeDay = time.getDate();
  var timeMonth = time.getMonth() + 1;
  var tomorrowDay = timeDay + 1;
  if (timeMonth < 10) {
    timeMonth = '0' + timeMonth;
  }
  if (timeDay < 10) {
    timeDay = '0' + timeDay;
  }
  if (tomorrowDay < 10) {
    tomorrowDay = '0' + tomorrowDay;
  }
  var url = "http://stu.sen.go.kr/sts_sci_sf01_001.do?schulCode=B100000599&schulCrseScCode=4&schulKndScCode=04&ay={{year}}&mm={{month}}";
  var modernUrl = url.replace('{{year}}', timeYear).replace('{{month}}', timeMonth);
  
  request(modernUrl, function (err, res, body) {
    
    if (err) return console.log(err);
    
    var $ = cheerio.load(body);
    var elements = $('tbody td');
    var message = "";
    
    elements.each(function () {
      var data = $(this).find('strong').text();
      var day = $(this).find('em').text();
      
      if (data != '') {
        message += day + '일' + data + '\n';
      }
    });
      if (message != '') {
        if (schduleState) {
          // 해당 월 일정
          var split_message = message.split('\n');
          for (var i = 0; i <= split_message.length - 1; i++) {
            if (i == split_message.length - 1) {
              callback(timeMonth + '월 일정입니다 \n' + message);
              break;
            }
            if (split_message[i].substr(0, 2) == timeDay && split_message[i+1].substr(0,2) == tomorrowDay) {
              callback(timeMonth + '월 일정입니다 \n' + message + '\n오늘의 일정은 ' + split_message[i].substr(3) + '입니다.\n' + '내일 일정은 ' + split_message[i + 1].substr(3) + '입니다');
              break;
            } else if (split_message[i].substr(0,2) == tomorrowDay) {
              callback(timeMonth + '월 일정입니다 \n' + message + '\n내일 일정은 ' + split_message[i].substr(3) + '입니다');
              break;
            } else if (split_message[i].substr(0,2) == timeDay){
              callback(timeMonth + '월 일정입니다 \n' + message + '\n오늘의 일정은 ' + split_message[i].substr(3) + '입니다.');
              break;
            }
          }
        } else {
          //오늘 일정 또는 내일 일정
          message = message.split('\n');
          for (var i = 0; i <= message.length - 1; i++) {
            if ( i == message.length - 1 ) {
              callback('s');
              break;
            }
            if (message[i].substr(0, 2) == timeDay && message[i+1].substr(0,2) == tomorrowDay) {
              callback('오늘의 일정은 ' + message[i].substr(3) + '입니다.\n' + '내일 일정은 ' + message[i + 1].substr(3) + '입니다');
              break;
            } else if (message[i].substr(0,2) == tomorrowDay) {
              callback('내일 일정은 ' + message[i].substr(3) + '입니다');
              break;
            } else if (message[i].substr(0,2) == timeDay){
              callback('오늘의 일정은 ' + message[i].substr(3) + '입니다.');
              break;
            }
          }
        }
      } else {
        callback(timeMonth + "월 일정이 없습니다");
      }
  });
};


var job = function(callback) {
  schoolCafeteria(function (result1) {
    schoolSchedule(function (result2) {
      callback(result1+ '\n' + result2);
    }, true);
  },true);
}


  job(function(result) {
      console.log(result);
  })


// schoolCafeteria(function (result1) {
//   schoolSchedule(function (result2) {
//     console.log(result1+ '\n' + result2);
//   }, false)
// },true);