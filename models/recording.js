const sequelize = require('../database.js')
const { Sequelize, Model } = require('sequelize');
const _ = require('lodash')
class Recording extends Model {
}


Recording.statsObject = function () {
  return {
    'zones': {
      'hasWatts': false,
      'hasHeartRate': false,
      'Recovery': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Endurance': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Tempo': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Threshold': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'VO2 Max': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Anaerobic': {
        'watt-percentage': 0,
        'watt-seconds': 0
      },
    },
    'bests': {
      'hasHeartRate': false,
      'heartrate': {
        '1hr': 0,
        '20min': 0,
        '10min': 0,
        '5min': 0,
        'max': 0
      },
      'hasWatts': false,
      'watts': {
        '1hr': 0,
        '20min': 0,
        '10min': 0,
        '5min': 0,
        '2min': 0,
        '1min': 0,
        '30sec': 0,
        '5sec': 0,
        'max': 0
      }
    }
  }
}

buildZoneDistribution = function (watts, heartrate, hrZones, powerZones, stats) {
  const listLength = watts.length || heartrate.length

  //Determine if watts and or heart rate is present. Add to stats
  if (watts && watts.length > 0) {
    stats.zones.hasWatts = true
  } if (heartrate && heartrate.length > 0) {
    stats.zones.hasHeartRate = true
  }
  for (var i = 0; i < listLength; i++) {

    //Get watt seconds for particular zones
    if (watts.length > 0 && powerZones) {
      const value = _.find(powerZones, (item) => {
        return watts[i] >= item.low && (watts[i] <= item.high || item.title == 'Anaerobic')
      })
      if (value) {
        stats.zones[value.title]['watt-seconds'] += 1
        stats.zones[value.title]['watt-percentage'] = Math.round((stats.zones[value.title]['watt-seconds'] / listLength) * 100) / 100
      }
    }

    //Get hr seconds for particular zones
    if (heartrate.length > 0 && hrZones) {
      const value = _.find(hrZones, (item) => {
        return heartrate[i] >= item.low && (heartrate[i] <= item.high || item.title == 'VO2 Max')
      })
      if (value) {
        stats.zones[value.title]['hr-seconds'] += 1
        stats.zones[value.title]['hr-percentage'] = Math.round((stats.zones[value.title]['hr-seconds'] / listLength) * 100) / 100
      }
    }
  }
}

buildStats = function (stats, list, listName, i, seconds, timeSliceName) {
  const timeSlice = list.slice(i, seconds + i) //slice hr/watt array by time range
  const sum = _.sum(timeSlice) // sum that time range
  const average = sum / timeSlice.length // get average of time range
  if (average > stats.bests[listName][timeSliceName]) {  // if the averaged time range is greater than what is present, replace.
    stats.bests[listName][timeSliceName] = Math.round(average)
  }
}

Recording.getStats = function (stream, hrZones, powerZones) {
  const heartrate = stream.heartrate?.data ?? []
  const watts = stream.watts?.data ?? []
  const listLength = heartrate.length
  const stats = Recording.statsObject()
  if (watts.length > 0) {
    stats.hasWatts = true
  } if (heartrate.length > 0) {
    stats.hasHeartRate = true
  }
  buildZoneDistribution(watts, heartrate, hrZones, powerZones, stats)
  try {
    for (let i = 0; i < listLength; i++) {
      //1hr
      if ((i + 3600) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 3600, '1hr')
        }
        if (heartrate.length == listLength) {
          buildStats(stats, heartrate, 'heartrate', i, 3600, '1hr')
        }
      }

      //20min
      if ((i + 1200) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 1200, '20min')
        }
        if (heartrate.length == listLength) {
          buildStats(stats, heartrate, 'heartrate', i, 1200, '20min')
        }
      }

      //10min
      if ((i + 600) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 600, '10min')
        }
        if (heartrate.length == listLength) {
          buildStats(stats, heartrate, 'heartrate', i, 600, '10min')
        }
      }

      //5min
      if ((i + 300) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 300, '5min')
        }
        if (heartrate.length == listLength) {
          buildStats(stats, heartrate, 'heartrate', i, 300, '5min')
        }
      }

      //2min
      if ((i + 120) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 120, '2min')
        }
      }

      //1min
      if ((i + 60) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 60, '1min')
        }
      }

      //30sec
      if ((i + 30) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 30, '30sec')
        }
      }

      //5sec
      if ((i + 5) < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 5, '5sec')
        }
      }

      //max
      if (i + 1 < listLength) {
        if (watts.length == listLength) {
          buildStats(stats, watts, 'watts', i, 1, 'max')
        }
        if (heartrate.length == listLength) {
          buildStats(stats, heartrate, 'heartrate', i, 1, 'max')
        }
      }
    }
  } catch (e) {
    console.log(e)
  }

  return stats
}

Recording.findHRTSS = function (actor, heartrates) {
  try {
    let hrtss = null
    const k = actor.gender == 'male' ? 1.92 : 1.67
    const restinghr = actor.resting_hr
    const maxhr = actor.max_hr
    const thresholdhr = actor.threshold_hr
    if (restinghr && maxhr && thresholdhr) {
      let sum = 0
      heartrates.forEach((item, i) => {
        hrr = (item - restinghr) / (maxhr - restinghr)
        sum += (hrr * 0.64 * Math.exp(k * hrr))
      })
      const lthrr = (thresholdhr - restinghr) / (maxhr - restinghr)
      const trimpthresh = (lthrr * 0.64 * Math.exp(k * lthrr)) * 3600
      hrtss = Math.round((sum / trimpthresh) * 100) / 100
      return hrtss
    } else {
      return null;
    }
  } catch (e) {

  }
  return null;
}

Recording.formatRecording = function (user, actor) {
  // TODO
}

Recording.init({
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false },
  description: { type: Sequelize.STRING },
  length: { type: Sequelize.INTEGER, allowNull: false },
  activity: { type: Sequelize.STRING },
  duration: { type: Sequelize.INTEGER, allowNull: false },
  source: { type: Sequelize.STRING, allowNull: false },
  source_id: { type: Sequelize.STRING, allowNull: false },
  user_id: Sequelize.INTEGER,
  geom: { type: Sequelize.GEOMETRY("MultiLineString", 4326) },
  hr_effort: Sequelize.INTEGER,
  effort: Sequelize.INTEGER,
  stats: Sequelize.JSONB,
  started_at: Sequelize.DATE,
  stopped_at: Sequelize.DATE
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'recordings' // We need to choose the model name
});



module.exports = Recording