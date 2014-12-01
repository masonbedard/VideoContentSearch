var _ = require('lodash');
var SortedSet = require('sset');

var SearchResult = function(timeRanges, length) {
    this.timeRanges = timeRanges;
    this.length = length;
};

var insertAux = function(self, words, timeRange) {
    if (!words.length) {
        return;
    }
    var child = self.children[words[0]]; 
    if (!child) {
        child = new CaptionTrieNode(words[0]);
        self.children[words[0]] = child;
    } else if (!child.addTimeRange) {
        child = new CaptionTrieNode(child.word, child.chidren, child.timeRange);
        self.children[words[0]] = child;
    }
    child.addTimeRange(timeRange);
    insertAux(child, _.rest(words), timeRange);
};

var searchAux = function(self, words, length) {
    if (!words.length) {
        return new SearchResult(self.timeRanges, length);
    }
    var child = self.children[words[0]];
    if (!child) {
        return new SearchResult(self.timeRanges, length); 
    }
    return searchAux(child, _.rest(words), length + 1);
};

var CaptionTrie = function(captionTrieJSON) {
    if (captionTrieJSON) {
        this.children = captionTrieJSON;
    } else {
        this.children = {};
    }
};

CaptionTrie.prototype.insert = function(phrase, timeRange) {
    var words = phrase.split(' ');
    for (var i = 0; i < words.length; i++) {
        insertAux(this, _.rest(words, function(value, index) {
            return index < i; 
        }), timeRange); 
    }
};

CaptionTrie.prototype.search = function(phrase) {
    var searchResults = SortedSet(function(a, b) {
        return a.length - b.length;
    });
    var words = phrase.split(' ');
    for (var i = 0; i < words.length; i++) {
        var searchResult = searchAux(this, _.rest(words, function(value, index) {
            return index < i;
        }), 0);
        if (!searchResult.length) {
            continue;
        }
        searchResults.add(searchResult);
    } 
    return searchResults;
}

var CaptionTrieNode = function(word, children, timeRanges) {
    this.word = word;
    this.children = children || {};
    this.timeRanges = timeRanges || SortedSet(function(a, b) {
        return (a.startHours * 3600 + a.startMinutes * 60 + a.startSeconds) - (b.startHours * 3600 + b.startMinutes * 60 + b.startSeconds);
    });
};

CaptionTrieNode.prototype.addTimeRange = function(timeRange) {
    this.timeRanges.add(timeRange);
};

module.exports = CaptionTrie;