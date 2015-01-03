'use strict';

var $ = require('jquery-browserify');
var _ = require('lodash');
var Comm = require('./utilities/comm');
var TimeParser = require('./utilities/timeParser')
var CaptionTrie = require('./models/captionTrie');
var searchFormTemplate = require('../hbs/searchForm.hbs');
var errorTemplate = require('../hbs/error.hbs');
var searchResultTemplate = require('../hbs/searchResult.hbs');
var emptySearchResultTemplate = require('../hbs/emptySearchResult.hbs');
var tagsFormTemplate = require('../hbs/tagsForm.hbs');
var TimeRange = require('./models/timeRange');

var videoId;
var videoDuration;
var progressBarWidth = 160;
var captionTrie;
var domain;

var Time = function(currentTime) {
    currentTime = Math.floor(currentTime);
    this.hours = Math.floor(currentTime / 3600);
    currentTime = currentTime % 3600;
    this.minutes = Math.floor(currentTime / 60);
    currentTime = currentTime % 60;
    this.seconds = currentTime;
    this.hoursString = ('0' + this.hours).slice(-2);
    this.minutesString = ('0' + this.minutes).slice(-2);
    this.secondsString = ('0' + this.seconds).slice(-2);
};

var getProgressBoxCSS = function(timeRange) {
    var marginLeft = timeRange.currentTime / videoDuration * progressBarWidth; 
    var endCurrentTime = (timeRange.endHours * 3600) + (timeRange.endMinutes * 60) + timeRange.endSeconds;
    var timeRangeDuration = endCurrentTime - timeRange.currentTime; 
    var width = timeRangeDuration / videoDuration * progressBarWidth;
    return {
        'margin-left': marginLeft + 'px',
        'width': width + 'px'
    };
};

var displaySearchResults = function(query, displayEmpty) {
    var $searchResults = $('#search-results');
    $searchResults.empty();
    var searchResults = captionTrie.search(query).items;
    var seenTimes = {};
    if (searchResults.length) {
        _.each(searchResults, function(searchResult) {
            console.log('search result has length ' + searchResult.length);
            _.each(searchResult.timeRanges.items, function(timeRange) {
                if (seenTimes[timeRange.currentTime]) {
                    return;
                } 
                seenTimes[timeRange.currentTime] = true;
                var titleBuilder = [];
                titleBuilder.push(timeRange.startHoursString);
                titleBuilder.push(':');
                titleBuilder.push(timeRange.startMinutesString);
                titleBuilder.push(':');
                titleBuilder.push(timeRange.startSecondsString);
                titleBuilder.push(' - ');
                titleBuilder.push(timeRange.endHoursString);
                titleBuilder.push(':');
                titleBuilder.push(timeRange.endMinutesString);
                titleBuilder.push(':');
                titleBuilder.push(timeRange.endSecondsString);
                var $searchResult = $(searchResultTemplate({'title': titleBuilder.join(''), 'score': 0}));
                $searchResult.data('currentTime', timeRange.currentTime);
                var marginLeft = timeRange.currentTime / videoDuration * progressBarWidth;
                $searchResult.find('.progress-box').css('margin-left', marginLeft + 'px');
                $searchResults.prepend($searchResult);
            });
        });
        localStorage.setItem('lastQuery', query);
        var $searchInput = $('#search-form').children('input:first');
        if ($searchInput.val() !== query) {
            $searchInput.val(query);
        }
    } else {
        $searchResults.append(emptySearchResultTemplate());
        localStorage.removeItem('lastQuery');
    }
};

var initCaptionTrie = function() {
    console.log('init caption trie');
    Comm.init(videoId, function(res) {
        if (res.err) {
           $('body').html(errorTemplate());
           return;
        }
        console.log('got response');
        captionTrie = new CaptionTrie(res.captionTrieData);
        console.log('ready to query');
        var query = localStorage.getItem('lastQuery');
        if (query && localStorage.getItem('videoId') === videoId) {
           // displaySearchResults(query);
        } 
        localStorage.setItem('videoId', videoId);
    });
};

var main = function() {

    chrome.tabs.query({'active': true}, function(tabs) {
        var url = tabs[0].url;
        if (!url) {
            $('body').html(errorTemplate());
            return;
        }
        if (url.indexOf('youtube') !== -1) {
            domain = 'youtube';
            var videoIdRegExp = /v=(\S+)/;
            videoId = videoIdRegExp.exec(url);
            if (!videoId) {
                console.log('no video id from youtube');
                return; 
            }
            videoId = videoId[1];
            chrome.tabs.executeScript({
                'code': 'document.getElementsByTagName("video")[0].duration;'            
            }, function(resultArr) {
                if (!resultArr || !resultArr[0]) {
                    console.log('video duration did not work');
                    return;
                }
                videoDuration = resultArr[0];
            });
            initCaptionTrie();
        } else if (url.indexOf('khanacademy') !== -1) {
            domain = 'khanacademy';
            chrome.tabs.executeScript({
                'code': 'document.getElementsByTagName("iframe")[0].getAttribute("data-youtubeid")'
            }, function(resultArr) { 
                if (!resultArr || !resultArr[0]) {
                    console.log('no video id from khan academy'); 
                    return;
                }
                videoId = resultArr[0];
                initCaptionTrie();
            });
        } else {
            console.log('say videos from here not yet supported');
        }
    });

    var $searchForm = $('#search-form');  
    $searchForm.submit(function(e) {
        e.preventDefault();
        var query = $searchForm.children('input:first').val();
        query = query.trim();
        if (query === '') {
            return;
        }
        console.log('querying');
        displaySearchResults(query);
    });

    $('#search-results').on('click', '.search-result', function() {
        var currentTime = $(this).data('currentTime');
        var script;
        if (domain === 'youtube') {
            script = 'document.getElementsByTagName("video")[0].currentTime = ' + currentTime + ';';
        } else if (domain === 'khanacademy') {
            script = 'var iframe = document.getElementsByTagName("iframe")[0]; var innerDoc = iframe.contentDocument || iframe.contentWindow.document; innerDoc.getElementsByTagName("video")[0].currentTime;';
        }
        chrome.tabs.executeScript({
            'code': script
        });
    });

    $('#tag-now-btn').on('click', function() {
        var script;
        if (domain === 'youtube') {
            script = 'document.getElementsByTagName("video")[0].currentTime;';
        } else if (domain === 'khanacademy') {
            script = 'var iframe = document.getElementsByTagName("iframe")[0]; var innerDoc = iframe.contentDocument || iframe.contentWindow.document; innerDoc.getElementsByTagName("video")[0].currentTime;';
        }
        chrome.tabs.executeScript({
            'code': script
        }, function(resultArr) {
            console.log('callback after executing script');
            if (!resultArr || !resultArr[0]) {
                console.log('notify and let them tag now again');
                return;
            }
            var currentTime = resultArr[0];
            console.log(currentTime);

            var time = new Time(currentTime);
            var $tagsForm = $(tagsFormTemplate({'time': new Time(currentTime)}));
            $tagsForm.submit(function(e) {
                e.preventDefault();

                var startTime = TimeParser.parse($tagsForm.children('input.tags-start-time').val());
                var endTime = TimeParser.parse($tagsForm.children('input.tags-end-time').val());
                var timeRange = new TimeRange(startTime.hours, startTime.minutes, startTime.seconds, endTime.hours, endTime.minutes, endTime.seconds);

                var tags = $tagsForm.children('input.tags').val();
                if (tags === '') {
                    return;
                }
                tags = tags.split(',')
                tags = _.map(tags, function(tag) {
                    return tag.trim();
                });

                console.log('req to server');
                Comm.save(videoId, timeRange, tags, function(res) {
                    if (res.err) {
                        console.log('notify and let them save again');
                        return;    
                    }
                    console.log('res from server');
                    $tagsForm.remove();
                    captionTrie = new CaptionTrie(res.captionTrieData);
                });

            });
            $('#tags-forms').append($tagsForm);
            $tagsForm.find('.tags').focus();
        });
    });

    $('#search-results').on('click', '.fui-triangle-up', function() {
        var oldVote = localStorage.getItem(videoId);
        var scoreDiff = 0;
        var $scoreSpan = $(this).parent().find('span.score');
                $scoreSpan.text(parseInt($scoreSpan.text()) + 1);

        // if (oldVote === 'up') {
        //     scoreDiff = -1;
        // } else if (oldVote === 'down') {
        //     scoreDiff = 2;
        // } else {
        //     scoreDiff = 1;
        // }
        // Comm.vote(videoId, scoreDiff, function(res) {
        //     if (res.err) {
        //         console.log('notify');
        //         return;
        //     }
        //     if (scoreDiff === -1) {
        //         localStorage.removeItem(videoId);
        //     } else {
        //         localStorage.setItem(videoId, 'up');
        //     }
        //     $scoreSpan.text(parseInt($scoreSpan.text()) + scoreDiff);
        // });
    });
    $('#search-results').on('click', '.fui-triangle-down', function() {
        var oldVote = localStorage.getItem(videoId);
        var scoreDiff = 0;
        var $scoreSpan = $(this).parent().find('span.score');
        $scoreSpan.text(parseInt($scoreSpan.text()) - 1);
        // if (oldVote === 'down') {
        //     scoreDiff = 1;
        // } else if (oldVote === 'up') {
        //     scoreDiff = -2;
        // } else {
        //     scoreDiff = -1;
        // }
        // Comm.vote(videoId, scoreDiff, function(res) {
        //     if (res.err) {
        //         console.log('notify');
        //         return;
        //     }
        //     if (scoreDiff === 1) {
        //         localStorage.removeItem(videoId);
        //     } else {
        //         localStorage.setItem(videoId, 'down');
        //     }
        //     $scoreSpan.text(parseInt($scoreSpan.text()) + scoreDiff);
        // });
    });
    $('#search-results').on('click', '.fui-triangle-down', function() {
    });

};
main();
