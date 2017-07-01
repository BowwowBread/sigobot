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



var schoolSchedule = function (callback, schduleState) {
  
  var time = new Date();
  var timeYear = time.getFullYear();
  var timeMonth = time.getMonth() + 1;
  var timeDay = time.getDate();
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
    try {
      if (message != '') {
        if (schduleState) {
          callback(timeMonth + '월 일정입니다 \n' + message);
          message = message.split('\n');
          for (var i = 0; i <= message.length; i++) {
            if (message[i].substr(0, 2) == timeDay) {
              callback('오늘의 일정은 ' + message[i].substr(3) + '입니다.');
            }
            if (message[i + 1].substr(0, 2) == tomorrowDay) {
              callback('내일 일정은 ' + message[i + 1].substr(3) + '입니다');
            }
          }
        } else {
          message = message.split('\n');
          for (var i = 0; i <= message.length; i++) {
            if (message[i].substr(0, 2) == timeDay) {
              callback('오늘의 일정은 ' + message[i].substr(3) + '입니다.');
            }
            if (message[i + 1].substr(0, 2) == tomorrowDay) {
              callback('내일 일정은 ' + message[i + 1].substr(3) + '입니다');
            }
          }
        }
      } else {
        callback(timeMonth + "월 일정이 없습니다");
      }
    } catch (e) {
      
    }
  });
};

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
var job = function(callback) {
  schoolCafeteria(function (result) {
    callback(result);
  },true);
  schoolSchedule(function (result) {
    callback(result);
  }, false)
}
job(function(result) {
  console.log(result);
})