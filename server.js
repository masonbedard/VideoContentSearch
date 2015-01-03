var _ = require('lodash');
var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var entities = new (require('html-entities').AllHtmlEntities)();
var db = require('diskdb');
var CaptionTrie = require('./src/js/models/captionTrie');
var TimeRange = require('./src/js/models/timeRange');

db.connect('./data', ['captionTries']);

var app = express();
app.use(express.static(__dirname + "/../public"));
app.use(bodyParser.json());

var server = app.listen(8989);

var constructYoutubeUrl = function(videoId) {
    return 'https://www.youtube.com/watch?v=' + videoId;
};

app.post('/init', function(req, res) {

    console.log('init');

    var videoId = req.body.videoId;

    var captionTrie = db.captionTries.findOne({'videoId': videoId});
    if (captionTrie) {
        res.json({'err': false, 'captionTrieData': captionTrie.data});
        return;
    }

    var options = {
        'url': 'http://www.serpsite.com/transcript.php',
        'qs': {
            'videoid': constructYoutubeUrl(videoId)
        }
    };
    request(options, function(err, response, body) {
        if (err) {
            console.log('got an error on request to serp');
            res.json({'err': true});
            return;
        }
        var srtRegExp = /<textarea name= 'srt' style = 'display:none;'>([^]*?)<\/textarea>/;
        var srt = srtRegExp.exec(body);
        if (!srt) {
            console.log('there')
            res.json({'err': true});
            return;
        }
        var captionTrie = new CaptionTrie();
        var timeCaptionRegExp = /\d+\n(\d\d):(\d\d):(\d\d),\d+ --> (\d\d):(\d\d):(\d\d),\d+\n([^]*?)\n\n/g;
        var timeCaption;
        while (timeCaption = timeCaptionRegExp.exec(srt[1])) {
            var startHours = parseInt(timeCaption[1]);
            var startMinutes = parseInt(timeCaption[2]);
            var startSeconds = parseInt(timeCaption[3]);

            var endHours = parseInt(timeCaption[4]);
            var endMinutes = parseInt(timeCaption[5]);
            var endSeconds = parseInt(timeCaption[6]);

            var timeRange = new TimeRange(startHours, startMinutes, startSeconds, endHours, endMinutes, endSeconds);

            var caption = entities.decode(timeCaption[7].toLowerCase()).replace(/\n/g, ' ');
            captionTrie.insert(caption, timeRange);
        }

        db.captionTries.save({'videoId': videoId, 'data': captionTrie.children});
        res.json({'err': false, 'captionTrieData': captionTrie.children});
        console.log('gave response');
    });

});

app.post('/save', function(req, res) {

    console.log('save');

    var videoId = req.body.videoId;
    var timeRange = req.body.timeRange;
    var tags = req.body.tags;

    var captionTrie = db.captionTries.findOne({'videoId': videoId});
    if (!captionTrie) {
        res.json({'err': true});
        return;
    }
    captionTrie = new CaptionTrie(captionTrie.data);
    console.log(captionTrie);
    _.each(tags, function(tag) {
        captionTrie.insert(tag, timeRange); 
    });
    if (db.captionTries.update({'videoId': videoId}, {'data': captionTrie.children}).updated !== 1) {
        res.json({'err': true});
        return;
    }
    res.json({'err': false, 'captionTrieData': captionTrie.children});
});

app.post('/vote', function(req, res) {
    console.log('got a vote');
    console.log(req.body.scoreDiff);
    console.log(req.body.videoId);
    res.json({'err': false})
});

console.log("listening on port 8989");



