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

var getVideoId = function(url) {
    var videoIdRegExp = /v=(\S+)/;
    var videoId = videoIdRegExp.exec(url);
    if (!videoId) {
        return null;
    }
    return videoId[1];
};

var main = function() {

    var url;
    var videoId;
    var captionTrie;
    var $searchForm = $('#search-form');

    chrome.tabs.query({'active': true}, function(tabs) {

        url = tabs[0].url;
        if (!url) {
            $('body').html(errorTemplate());
            return;
        }

        videoId = getVideoId(url);
        if (!videoId) {
            $('body').html(errorTemplate());
            return;
        }

        Comm.init(url, videoId, function(res) {
            if (res.err) {
               $('body').html(errorTemplate());
               return;
            }
            captionTrie = new CaptionTrie(res.captionTrieData);
        });

    });

    $searchForm.submit(function(e) {
        e.preventDefault();

        var query = $searchForm.children('input:first').val();
        query = query.trim();
        if (query === '') {
            return;
        }

        var $searchResults = $('#search-results');
        $searchResults.empty();
        var $searchResultsContainer = $(document.createElement('div'));
        var searchResults = captionTrie.search(query).items;
        var seenTimes = {};
        if (searchResults.length) {
            _.each(searchResults, function(searchResult) {
                _.each(searchResult.timeRanges.items, function(timeRange) {
                    if (seenTimes[timeRange.currentTime]) {
                        return;
                    } 
                    seenTimes[timeRange.currentTime] = true;
                    var $searchResult = $(searchResultTemplate({'timeRange': timeRange}));
                    $searchResult.data('currentTime', timeRange.currentTime);
                    $searchResultsContainer.append($searchResult);
                });
            });
        } else {
            console.log('adding empty thing');
            $searchResultsContainer.append(emptySearchResultTemplate());
        }
        $searchResults.append($searchResultsContainer);
    });

    $('#search-results').on('click', 'li.search-result', function() {
        var currentTime = $(this).data('currentTime');
        chrome.tabs.executeScript({
            'code': 'document.getElementsByTagName("video")[0].currentTime = ' + currentTime + ';' 
        });
    });

    $('button').on('click', function() {
        chrome.tabs.executeScript({
            'code': 'document.getElementsByTagName("video")[0].currentTime;'
        }, function(resultArr) {

            var currentTime = resultArr[0];
            if (!currentTime) {
                console.log('notify and let them tag now again');
                return;
            }

            var time = new Time(currentTime);
            var $tagsForm = $(tagsFormTemplate({'time': new Time(currentTime)}));
            console.log('creating tags form');
            $tagsForm.submit(function(e) {
                console.log('submitted');
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

                Comm.save(url, videoId, timeRange, tags, function(res) {
                    if (res.err) {
                        console.log('notify and let them save again');
                        return;    
                    }
                    $tagsForm.remove();
                    captionTrie = new CaptionTrie(res.captionTrieData);
                });

            });
            $('#tags-forms').append($tagsForm);
            $tagsForm.find('.tags').focus();
        });
    });

};
main();
