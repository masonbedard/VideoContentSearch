var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var entities = new (require('html-entities').AllHtmlEntities)();
var CaptionTrie = require('./src/js/models/captionTrie');
var TimeRange = require('./src/js/models/timeRange');

var app = express();
app.use(express.static(__dirname + "/../public"));
app.use(bodyParser.json());

var server = app.listen(8989);

app.post('/init', function(req, res) {

    console.log(req.body.url)

    var options = {
        'url': 'http://www.serpsite.com/transcript.php',
        'qs': {
            'videoid': req.body.url
        }
    };

    console.log('here')

    request(options, function(err, response, body) {
        console.log('got a response')
        if (err) {
            console.log('got an error on request to serp');
            res.json({'err': true});
            return;
        }
        console.log(body)
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

        console.log('got a caption trie')
        console.log(captionTrie)

        //save it to this video id

        res.json({'err': false, 'captionTrieJSON': captionTrie.children});

    });


});

app.post('/save', function(req, res) {
    console.log(req.body); 
    res.json({'err': false});
});

console.log("listening on port 8989");



