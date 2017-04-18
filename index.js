const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const stringSimilarity = require('string-similarity');
const cheerio = require('cheerio');

const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send('this is sigo chatbot!')
})

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === token) {
    res.send(req.query['hub.challenge'])
  }
  res.send('No entry')
})

app.post('/webhook', function (req, res) {
  var data = req.body;

  if (data.object === 'page') {

    data.entry.forEach(function (entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function (event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    res.sendStatus(200);
  }
});

// 학교 급식
var schoolCafeteria = function (callback) {

  // 현재 날짜
  var time = new Date();
  var timeNow = time.getFullYear() + '' + ("0" + (time.getMonth() + 1)).slice(-2); // 결과 201701
  var timeDay = time.getDate();

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
var schoolSchedule = function (callback) {

  var time = new Date();
  var timeYear = time.getFullYear();
  var timeMonth = time.getMonth() + 1;
  var timeDay = time.getDate();

  if (timeMonth < 10) {
    timeMonth = '0' + timeMonth;
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
      callback(timeMonth+'월 일정입니다');    
      callback(message);
    } else {
      callback(timeMonth + "월 일정이 없습니다");
    }
  });
};

// 날씨
var weatherParser = function (callback) {

  var url = 'http://www.kma.go.kr/weather/forecast/mid-term-rss3.jsp?stnId=109';
  request(url, function (err, response, body) {
    var index = body.indexOf("<![CDATA[") + 9;
    var last = body.indexOf("]]>");
    var text = body.substring(index, last);
    var replaceText = text.replace(/<br \/>/ig, "\n");
    // return replaceText;
    callback(replaceText);
  });
};

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    var detecting = {
      cafeteria: ['오늘급식', '급식', '내일급식', '점심', '오늘점심', '내일점심'],
      schedule: ['스케줄', '일정', '내일일정'],
      hi: ['안녕', 'hi', '하이', '방가', '인사', '반가워'],
      weather: ['weather', '날씨', '오늘 날씨'],
    };

    // 텍스트 매칭
    var cafeMatching = stringSimilarity.findBestMatch(messageText, detecting.cafeteria).bestMatch;
    var scheduleMatching = stringSimilarity.findBestMatch(messageText, detecting.schedule).bestMatch;
    var hiMatching = stringSimilarity.findBestMatch(messageText, detecting.hi).bestMatch;
    var weatherMatching = stringSimilarity.findBestMatch(messageText, detecting.weather).bestMatch;

    if (hiMatching.rating > 0.5) {
      sendTextMessage(senderID, '안녕하세요');
    }
    if (cafeMatching.rating > 0.5) {
      schoolCafeteria(function (result) {
        sendTextMessage(senderID, result);
      })
    }
    if (scheduleMatching.rating > 0.5) {
      schoolSchedule(function (value) {
        sendTextMessage(senderID, result);
      })
    }
    if (weatherMatching.rating > 0.5) {
      weatherParser(function (value) {
        sendTextMessage(senderID, "오늘의 날씨는 " + result);
      })
    } else {
      sendTextMessage(senderID, messageText);
    }
  }

}

function sendGenericMessage(recipientId, messageText) {
  // To be expanded in later sections
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {
      access_token: access
    },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}
app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'))
})