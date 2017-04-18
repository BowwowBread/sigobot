const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const stringSimilarity = require('string-similarity');
const cheerio = require('cheerio');

const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send('this is sigo chatbot!')
})

app.get('/webhook/', function(req, res) {
  if(req.query['hub.verify_token'] === token) {
    res.send(req.query['hub.challenge'])
   }
   res.send('No entry')
})

app.post('/webhook', function (req, res) {
  var data = req.body;

  if (data.object === 'page') {

    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function(event) {
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
var schoolCafeteria = function (chat) {

  // 현재 날짜
  var time = new Date();
  var timeNow = time.getFullYear() + '' + ("0" + (time.getMonth() + 1)).slice(-2); // 결과 201701
  var timeDay = time.getDate();
  if (chat.indexOf("내일") != -1) {
    timeDay += 1;
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
        return "나이스 서버 오류 입니다.";
      }
      // 해당 날짜 급식을 배열로 변환
      var postArray = postDiv.split("<br>");

      var result = "";
      if (postArray[0] == timeDay) {
        if (postArray.length <= 1) {
          return "급식을 먹는날이 아닙니다";
        } else {
          for (var i = 0; i < postArray.length; i++) {
            result = result + postArray[i] + '\n';
          }
          return result;
        }
      }
    });
  });
};

// 학교 일정
var schoolSchedule = function () {

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
      return timeMonth + '월 일정입니다';
    } else {
      return timeMonth + "월 일정이 없습니다";
    }
  });
};

// 날씨
var weatherParser = function () {

  var url = 'http://www.kma.go.kr/weather/forecast/mid-term-rss3.jsp?stnId=109';
  request(url, function (err, response, body) {
    var index = body.indexOf("<![CDATA[") + 9;
    var last = body.indexOf("]]>");
    var text = body.substring(index, last);
    var replaceText = text.replace(/<br \/>/ig, "\n");
    return replaceText;
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

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID);
        break;

      default:
        sendTextMessage(senderID, "어쩌라고");
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
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
    qs: { access_token: access },
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
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})