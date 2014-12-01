var TimeRange = function(startHours, startMinutes, startSeconds, endHours, endMinutes, endSeconds) {
    this.startHours = startHours;
    this.startMinutes = startMinutes;
    this.startSeconds = startSeconds;
    this.endHours = endHours || startHours;
    this.endMinutes = endMinutes || startMinutes;
    this.endSeconds = endSeconds || startSeconds;
    this.currentTime = (startHours * 3600) + (startMinutes * 60) + startSeconds;
    this.startHoursString = ('0' + this.startHours).slice(-2);
    this.startMinutesString = ('0' + this.startMinutes).slice(-2);
    this.startSecondsString = ('0' + this.startSeconds).slice(-2);
    this.endHoursString = ('0' + this.endHours).slice(-2);
    this.endMinutesString = ('0' + this.endMinutes).slice(-2);
    this.endSecondsString = ('0' + this.endSeconds).slice(-2);
};

module.exports = TimeRange;