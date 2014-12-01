var $ = require("jquery-browserify");
var SERVER = require('../../../config').server;

module.exports = {

    init: function(url, videoId, callback) {
        $.ajax({
            'url': SERVER + '/init',
            'type': 'POST',
            'contentType': 'application/json',
            'data': JSON.stringify({'url': url, 'videoId': videoId}),
            'success': function(res) {
                callback(res);
            }
        });
    },

    save: function(url, videoId, timeRange, tags, callback) {
        $.ajax({
            'url': SERVER + '/save',
            'type': 'POST',
            'contentType': 'application/json',
            'data': JSON.stringify({'url': url, 'videoId': videoId, 'timeRange': timeRange, 'tags': tags}),
            'success': function(res) {
                callback(res);
            }
        });
    }

};