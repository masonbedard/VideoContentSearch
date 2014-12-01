module.exports = {
    parse: function(timeString) {
        var timeRegExp = /(\d\d):(\d\d):(\d\d)/;
        var time = timeRegExp.exec(timeString);
        if (!time) {
            return null;
        };
        return {
            'hours': parseInt(time[1]),
            'minutes': parseInt(time[2]),
            'seconds': parseInt(time[3])
        }
    }
};