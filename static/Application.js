app = angular.module('AlarmClock', [])

app.service("alarmAudioService", function () {
    this.element = $("<audio preload loop>").append($("<source>").attr("src", "/static/clock.wav"))
    this.play = function () {
        this.element.get(0).play()
    }

    this.pause = function () {
        this.element.get(0).pause()
    }
})

app.service("wordService", ['$rootScope', function ($rootScope) {
    this.word = null
    this.refresh = function () {
        
        this.word = null

        var _this = this
        $.getJSON("http://randomword.setgetgo.com/get.php?callback=?", null, function (data) {
            $rootScope.$apply(function () {
                _this.word = $.trim(data.Word)
            })
        })
    }
}])



function Alarm(date) {
    this.date = date
    this.timeLeft = moment.duration('seconds', 0)
}

Alarm.prototype.isExpired = function () {
    return (this.timeLeft.asMilliseconds() < 0)
}

Alarm.prototype.setTimeLeft = function () {
    this.timeLeft = moment.duration(this.date - moment())
}

Alarm.prototype.getFormattedTimeLeft = function () {
    if (this.isExpired()) {
        return "---"
    } else {
        return this.timeLeft.hours() + ":" + this.timeLeft.minutes() + ":" + this.timeLeft.seconds()
    }
}




app.controller('AppController', ['$scope', '$http', '$q', 'alarmAudioService', 'wordService', 
function ($scope, $http, $q, alarmAudioService, wordService) {

    // Give the view access to wordService's word
    $scope.wordService = wordService
    

    // The pending input text and main list of alarm objects
    $scope.pending = ""
    $scope.alarms = []

    // For ordering by which alarms are expired, we need this simple proxy:
    $scope.expirationSort = function(alarm) {
        if (alarm.isExpired()) {
            return -1
        } else {
            return 1
        }
    }


    // The alarm that is currently going off. Can only have one.
    $scope.currentAlarm = null

    

    $scope.settings = {
        numWords: 6
    }

    $scope.wordsCompleted = 0


    $scope.cancel = function (alarm) {
        if (alarm == $scope.currentAlarm) {
            $scope.currentAlarm.stop()
            $scope.alarms.splice($scope.alarms.indexOf($scope.currentAlarm), 1)
            $scope.currentAlarm = null
        } else {
            $scope.alarms.splice($scope.alarms.indexOf(alarm), 1)
        }
    }

    $scope.checker = setInterval(function () {
        $scope.$apply(function () {
            var i = 0
            for (i = 0; i < $scope.alarms.length; i ++) {
                var alarm = $scope.alarms[i]
                alarm.setTimeLeft()
                if (alarm.isExpired() && ($scope.currentAlarm == null)) {
                    
                    wordService.refresh()
                    $scope.wordsCompleted = 0

                    $scope.currentAlarm = alarm
                    alarmAudioService.play()
                }
            }
        })
    }, 1000)

    $scope.doSubmit = function () {
        
        // The text field has completely different function when turning off an alarm
        if ($scope.currentAlarm) {

            if ($scope.pending == $scope.wordService.word) {
                $scope.wordsCompleted += 1
                if ($scope.wordsCompleted == $scope.settings.numWords) {
                    $scope.alarms.splice($scope.alarms.indexOf($scope.currentAlarm), 1)
                    $scope.currentAlarm = null
                    alarmAudioService.pause()
                } else {
                    wordService.refresh()
                }
            }

        } else if ($scope.pending.charAt(0) == "/") {

            // var cmdstr = $scope.pending.slice(1)
            // $scope.commandApi(cmdStr.split(" "))

        } else {

            var i = 0

            var parts = $scope.pending.split(",")
            for (i = 0; i < parts.length; i ++) {
                parts[i] = $.trim(parts[i])
                    
                var time = moment(parts[i], "HH:mm")
                var now = moment()
                var dayStart = moment().startOf('day')
                
                var chosen = dayStart.add({
                    hours: time.hour(),
                    minutes: time.minute()
                })

                while (chosen - now < 0) {
                    chosen.add('hours', 12)
                }

                $scope.alarms.push(new Alarm(chosen))

            }

        }

    }



    $scope.commandApi = function (cmd) {
        var top = cmd.shift()

        if (top == "set") {

            var key = cmd.shift()
            var val = cmd.shift()

            try {
                $scope.settings[key] = val
            } catch (err) {
                console.log("Couldn't set that property")
            }

        }
    }

}])