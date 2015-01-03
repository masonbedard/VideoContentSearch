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

// a model for a time object. could probably be a separate file. maybe not necessary
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

// displays result of a query
var displaySearchResults = function(query, displayEmpty) {
    var $searchResults = $('#search-results');

    // empties previous results
    $searchResults.empty();
    var searchResults = captionTrie.search(query).items;
    var seenTimes = {};

    // if there are results for the current query
    if (searchResults.length) {
        _.each(searchResults, function(searchResult) {
            _.each(searchResult.timeRanges.items, function(timeRange) {
                // avoids duplicates. not sure why there are duplicates. seems like an issue with the set data structure being used.
                if (seenTimes[timeRange.currentTime]) {
                    return;
                } 
                seenTimes[timeRange.currentTime] = true;
                // builds the string version of the time. this should probably be its own function. not sure if inside this file or outside. maybe in a view.js.
                // called title because it is only a title of the element so that it appears on hover. the time is not displayed normally, the progress bar is.
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
                // gives score should not be 0 by default
                var $searchResult = $(searchResultTemplate({'title': titleBuilder.join(''), 'score': 0}));
                // stores the time on the html element so that it can be retrieved when the element is clicked.
                $searchResult.data('currentTime', timeRange.currentTime);
                // determines how far the point in the progress bar should be. progress bar width should not be a constant as it is above set to 160.
                var marginLeft = timeRange.currentTime / videoDuration * progressBarWidth;
                $searchResult.find('.progress-box').css('margin-left', marginLeft + 'px');
                // adds this result to the search results div
                $searchResults.prepend($searchResult);
            });
        });
        // sets last query to this one so that if the extension is closed and then reopened this query will be automatically done.
        localStorage.setItem('lastQuery', query);
        var $searchInput = $('#search-form').children('input:first');
        // if the query was replaced from a previous search, the query is put into the search bar automatically so user knows what results are for.
        if ($searchInput.val() !== query) {
            $searchInput.val(query);
        }

    // if there arent results for the current query
    } else {
        $searchResults.append(emptySearchResultTemplate());
        localStorage.removeItem('lastQuery');
    }
};

// initializes caption trie and should perform automatic search of last query if relevant but that's buggy.
var initCaptionTrie = function() {
    Comm.init(videoId, function(res) {
        if (res.err) {
           $('body').html(errorTemplate());
           return;
        }
        captionTrie = new CaptionTrie(res.captionTrieData);
        // local storage stuff was slow and buggy so its actually not used at the moment. TODO.
        var query = localStorage.getItem('lastQuery');
        if (query && localStorage.getItem('videoId') === videoId) {
           // displaySearchResults(query);
        } 
        localStorage.setItem('videoId', videoId);
    });
};

var main = function() {

    // query for the active tab
    chrome.tabs.query({'active': true}, function(tabs) {
        var url = tabs[0].url;
        // if it couldnt get a url, give an error. TODO: error messages more descriptive.
        if (!url) {
            $('body').html(errorTemplate());
            return;
        }
        // for youtube
        if (url.indexOf('youtube') !== -1) {
            domain = 'youtube';
            var videoIdRegExp = /v=(\S+)/;
            videoId = videoIdRegExp.exec(url);
            if (!videoId) {
                console.log('no video id from youtube');
                // show error message
                return; 
            }
            videoId = videoId[1];
            // now has video id from url and now gets duration of video
            chrome.tabs.executeScript({
                'code': 'document.getElementsByTagName("video")[0].duration;'            
            }, function(resultArr) {
                if (!resultArr || !resultArr[0]) {
                    console.log('video duration did not work');
                    // show error message
                    return;
                }
                videoDuration = resultArr[0];
                initCaptionTrie();
            });
        // for khanacademy but doesnt work because of iframes. thats why its commented
        // } else if (url.indexOf('khanacademy') !== -1) {
        //     domain = 'khanacademy';
        //     chrome.tabs.executeScript({
        //         'code': 'document.getElementsByTagName("iframe")[0].getAttribute("data-youtubeid")'
        //     }, function(resultArr) { 
        //         if (!resultArr || !resultArr[0]) {
        //             console.log('no video id from khan academy'); 
        //             return;
        //         }
        //         videoId = resultArr[0];
        //         initCaptionTrie();
        //     });
        } else {
            console.log('say videos from here not yet supported');
            // error message
        }
    });

    // event handler for when user presses enter on search bar and queries.
    // doesnt have to go to server because caption trie should be on client.
    var $searchForm = $('#search-form');  
    $searchForm.submit(function(e) {
        e.preventDefault();
        var query = $searchForm.children('input:first').val();
        query = query.trim();
        if (query === '') {
            return;
        }
        displaySearchResults(query);
    });

    //  when a search result is clicked, take video automatically there.
    $('#search-results').on('click', '.search-result', function() {
        var currentTime = $(this).data('currentTime');
        var script;
        if (domain === 'youtube') {
            script = 'document.getElementsByTagName("video")[0].currentTime = ' + currentTime + ';';
        // khan academy commented out because it doesnt work with iframes. 
        // } else if (domain === 'khanacademy') {
        //     script = 'var iframe = document.getElementsByTagName("iframe")[0]; var innerDoc = iframe.contentDocument || iframe.contentWindow.document; innerDoc.getElementsByTagName("video")[0].currentTime;';
        // }
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
