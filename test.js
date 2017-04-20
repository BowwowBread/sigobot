const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const stringSimilarity = require('string-similarity');
const cheerio = require('cheerio');
var readline = require('readline');

var r = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var success = true;
var botWord;
var userWord;
var req;
var length;
var randomCount;

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

var matchWord = function (callback, wordDB, word) {
  if (wordDB[wordDB.length - 1] == word[0]) {
    request.post({
      url: 'http://0xf.kr:2580/wordchain/next',
      form: {
        char: word[0]
      }
    }, function (err, res, body) {
      req = JSON.parse(body);
      for (var i = 0; i < req.data.length; i++) {
        if (req.data[i].word === word) {
          success = true;
          userWord = word[word.length - 1];
          callback('정답입니다');
          request.post({
            url: 'http://0xf.kr:2580/wordchain/next',
            form: {
              char: userWord
            }
          }, function (err, res, body) {
            req = JSON.parse(body);
            if(req.data.length == 0) {
              console.log('봇이 졌습니다');
              process.exit();
            } else {
            randomCount = parseInt(Math.random() * (req.data.length - 0 + 1));
            console.log(req.data[randomCount].word);
            botWord = req.data[randomCount].word;
            }
          })
        }
      }
      if (!success) {
        success = false;
        callback('틀림');
      }
    })
  } else {
    success = false;
    callback('틀림');
  }
}
var random = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
randomCount = parseInt(Math.random() * (random.length - 0 + 1));
wordDB(function (result, len, req) {
  console.log(result);
  req = req;
  length = len;
  botWord = result;
}, random[randomCount]);
r.setPrompt('> ');
r.on('line', function (line) {
  if (line == 'exit') {
    r.close();
  }
  var input = line;
    matchWord(function (result) {
      console.log(result);
    }, botWord, input)
});
r.on('close', function () {
  process.exit();
});