var $ = require("jquery-browserify");
var SERVER = require('../../../config').server;

module.exports = {

    init: function(videoId, callback) {
        $.ajax({
            'url': SERVER + '/init',
            'type': 'POST',
            'contentType': 'application/json',
            'data': JSON.stringify({'videoId': videoId}),
            'success': function(res) {
                callback(res);
            }
        });
    },

    save: function(videoId, timeRange, tags, callback) {
        $.ajax({
            'url': SERVER + '/save',
            'type': 'POST',
            'contentType': 'application/json',
            'data': JSON.stringify({'videoId': videoId, 'timeRange': timeRange, 'tags': tags}),
            'success': function(res) {
                callback(res);
            }
        });
    },

    vote: function(videoId, scoreDiff, callback) {
        $.ajax({
            'url': SERVER + '/vote',
            'type': 'POST',
            'contentType': 'application/json',
            'data': JSON.stringify({'videoId': videoId, 'scoreDiff': scoreDiff}),
            'success': function(res) {
                callback(res);
            }
        });
    }

};