const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const stringSimilarity = require('string-similarity');
const cheerio = require('cheerio');

const token = process.env.FB_VERIFY_TOKEN
const access = "EAAHGoGpG0ZCMBAEXVwh2ijxXTGVZCStQRea5veLX35f9nJiL2uxaDdRJZChjo8VDpoHGDZAjMMaaThSOtDVgOzFdi89FniWchHuvSYcXq6eUPEwHJf1vg4ZBaJXOeu5PWDeEbDHa2E14UDwabgZCfWZC40gDln4pWg4PyVkxN106AZDZD"

app.set('port', (process.env.PORT || 9990))

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())
app.get('/', function (req, res) {
  res.send('this is sigo chatbot!')
})
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === "sigo") {
    res.send(req.query['hub.challenge'])
  }
  res.send('No entry')
})

app.post('/webhook', function (req, res) {
  var data = req.body;


    res.sendStatus(200);
  }
});



/**
 * Posting
 */

function postFeed(message) {
    request.post({
    url:'https://graph.facebook.com/v2.8/1529061383780127/feed?access_token=EAAHGoGpG0ZCMBAA5YY2AEIJN86msxWU4ivWkvKbZBFtjZCAiGVZA3PH6SV4eXlkb4memOSfDjHarQc7N4TWcyyoNYFZCgeRTimsacBufVMHZBvHU0ouKZAZCb5LoDeQ5FUkIKqUsntv9zJfiXPZA2c9LDW3naMymVeoXb2qmKBKBuqcfyRWIZABrfNY662D2ItMJlBVhXzIbw5MwZDZD', 
    form: {
      message:message,
    }}, 
  function(err,res,body){

  })
}
/**
 * Message
 */

// 학교 급식
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
      callback(timeMonth + '월 일정입니다');
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

var end2endState = false;
var success = true;
var botWord;
var userWord;
var req;
var length;
var randomCount;
var todayState = true;
var idData = [];
var endFirstState = true;
var i = 0;

// 단어사전
var wordDB = function (callback, word) {
  request.post({
    url: 'http://0xf.kr:2580/wordchain/next',
    form: {
      char: word[0]
    }
  }, function (err, res, body) {
    req = JSON.parse(body);
    randomCount = parseInt(Math.random() * (req.data.length - 0 + 1));
    callback(req.data[randomCount].word, req.data.length, req);
  })
}
/*
// 끝말잇기 매칭
var matchWord = function (callback, wordDB, word, senderID) {
  request.post({
    url: 'http://0xf.kr:2580/wordchain/next',
    form: {
      char: wordDB[wordDB.length - 1]
    }
  }, function (err, res, body) {
    if (err) {
      callback("오류");
      return;
    }
    req = JSON.parse(body);
    if (req.data.length == 0) {
      callback('당신이 졌습니다.');
      if (idData[i].score > idData[i].highscore) {
        callback(idData[i].score + "점으로 최고기록을 달성하였습니다.");
        idData[i].highscore = idData[i].score;
      } else {
        callback("총 점수는 " + idData[i].score + "입니다.");
      }
      end2endState = false;
      idData[i].state = false;
      success = true;
      botWord = "";
      userWord = "";
      req = "";
      length = "";
      return;
    }
    try {
      for (var j = 0; j < req.data.length; j++) {
        if (req.data[j].word === word) {
          success = true;
          userWord = word[word.length - 1];
          idData[i].score += req.data[j].score;
          callback('정답입니다');
          callback(req.data[j].score + "점 획득");
          request.post({
            url: 'http://0xf.kr:2580/wordchain/next',
            form: {
              char: userWord
            }
          }, function (err, res, body) {
            req = JSON.parse(body);
            if (req.data.length !== 0) {
              randomCount = parseInt(Math.random() * (req.data.length - 1));
              callback(req.data[randomCount].word);
              botWord = req.data[randomCount].word;
            } else {
              callback('봇이 졌습니다.');
              if (idData[i].score > idData[i].highscore) {
                callback(idData[i].score + "점으로 최고기록을 달성하였습니다.");
                idData[i].highscore = idData[i].score;
              } else {
                callback("총 점수는 " + idData[i].score + "입니다.");
              }
              end2endState = false;
              idData[i].state = false;
              success = true;
              botWord = "";
              userWord = "";
              req = "";
              length = "";
            }
          })
          break;
        } else {
          success = false;
        }
      }
      if (!success) {
        callback("단어가 없거나 틀립니다.");
      }
    } catch (e) {
      callback("단어가 없거나 틀립니다.");
    }
  })
}

var random = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
randomCount = parseInt(Math.random() * (random.length - 0 + 1));
*/


// 메세지 수신
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));


  var messageText = message.text;

  if (messageText) {
    var detecting = {
      cafeteria: ['급식', '점심', '오늘점심', '내일급식'],
      schedule: ['스케줄', '일정', '달력'],
      hi: ['안녕', 'hi', '하이', '방가', '인사', '반가워'],
      weather: ['weather', '날씨', '오늘 날씨'],
      /*
      end2endStart: ['끝말잇기 시작'],
      end2endFinish: ['끝말잇기 종료'],
      */
      help: ['help', '도움말'],
      info: ['내정보'],
      post: ['글쓰기'],
    };


    // 텍스트 매칭
    var postMatching = stringSimilarity.findBestMatch(messageText, detecting.post).bestMatch;
    var cafeMatching = stringSimilarity.findBestMatch(messageText, detecting.cafeteria).bestMatch;
    var scheduleMatching = stringSimilarity.findBestMatch(messageText, detecting.schedule).bestMatch;
    var hiMatching = stringSimilarity.findBestMatch(messageText, detecting.hi).bestMatch;
    var weatherMatching = stringSimilarity.findBestMatch(messageText, detecting.weather).bestMatch;
    /*
    var end2endStartMatching = stringSimilarity.findBestMatch(messageText, detecting.end2endStart).bestMatch;
    var end2endFinishMatching = stringSimilarity.findBestMatch(messageText, detecting.end2endFinish).bestMatch;
    */
    var helpMatching = stringSimilarity.findBestMatch(messageText, detecting.help).bestMatch;
    var infoMatching = stringSimilarity.findBestMatch(messageText, detecting.info).bestMatch;

    /*
    // 끝말잇기 상태
    let length = idData.length;
    var i = 0;
    end2endState = false;
    for (i = 0; i < length; i++) {
      if (idData[i].id === senderID && idData[i].state === true) {
        end2endState = true;
        break;
      }
    }
    if (end2endState) {
      if (end2endFinishMatching.rating == 1) {
        end2endState = false;
        idData[i].state = false;
        success = true;
        botWord = "";
        userWord = "";
        req = "";
        length = "";
        sendTextMessage(senderID, "끝말잇기를 종료하였습니다.");
        if (idData[i].score > idData[i].highscore) {
          sendTextMessage(senderID, idData[i].score + "점으로 최고기록을 달성하였습니다.");
          idData[i].highscore = idData[i].score;
        } else {
          sendTextMessage(senderID, "총 점수는 " + idData[i].score + "점 입니다.");
        }
        idData[i].state = false;
      } else if (!(end2endFinishMatching.rating == 1)) {
        matchWord(function (result) {
          sendTextMessage(senderID, result);
        }, botWord, messageText, senderID)
      }
    } else {
      */
    if (hiMatching.rating > 0.5) {
      sendTextMessage(senderID, '안녕하세요');
    } else if (cafeMatching.rating > 0.5) {
      if (messageText.match('내일')) {
        todayState = false;
        schoolCafeteria(function (result) {
          sendTextMessage(senderID, result);
        }, todayState)
      } else {
        todayState = true;
        schoolCafeteria(function (result, todayState) {
          sendTextMessage(senderID, result);
        }, todayState)
      }
    } else if (scheduleMatching.rating > 0.5) {
      schoolSchedule(function (result, todayState) {
        sendTextMessage(senderID, result);
      })
    } else if (weatherMatching.rating > 0.5) {
      weatherParser(function (result) {
        sendTextMessage(senderID, "오늘의 날씨입니다 \n" + result);
      })
    } else if (infoMatching.rating > 0.5) {
      sendTextMessage(senderID, senderID);
      sendTextMessage(senderID, end2endState);
      sendTextMessage(senderID, endFirstState);
    }
    /*
    else if (end2endStartMatching.rating == 1) {
      for (var i = 0; i < length; i++) {
        if (idData[i].id === senderID) {
          endFirstState = false;
          break;
        } else {
          endFirstState = true;
        }
      }
      if (endFirstState) {
        idData.push({
          id: senderID,
          state: true,
          score: 0,
          highscore: 0,
        });
      } else if (!endFirstState) {
        idData[i].state = true;
        idData[i].score = 0;
        sendTextMessage(senderID, "현재 최고점수는 " + idData[i].highscore + "점 입니다.");
      }
      end2endState = false;
      success = true;
      botWord = "";
      userWord = "";
      req = "";
      length = "";
      randomCount = parseInt(Math.random() * (random.length - 1));
      sendTextMessage(senderID, "끝말잇기를 시작였습니다. 중단하시려면 '끝말잇기 종료'를 입력해주세요");
      wordDB(function (result, len, req) {
        sendTextMessage(senderID, result);
        req = req;
        length = len;
        botWord = result;
      }, random[randomCount]);
      */
    else if (helpMatching.rating > 0.7) {
      sendTextMessage(senderID, "SIGO 봇 도움말입니다 \n 급식, 일정, 날씨를 입력하면 정보를 제공해줍니다");
    } else if (postMatching.rating > 0.7) {
      sendTextMessage(senderID, "글쓰기중")
      postFeed("테스트");
    } else {
      sendTextMessage(senderID, messageText);
    }
  }
}


function sendGenericMessage(recipientId, messageText) {
  // To be expanded in later sections
}

// 메세지 발신
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