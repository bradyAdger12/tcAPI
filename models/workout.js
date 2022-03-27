const sequelize = require('../database.js')
const { Sequelize, Model, Op } = require('sequelize');
const _ = require('lodash')
const moment = require('moment')

class Workout extends Model {
}

Workout.init({
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
  streams: Sequelize.JSONB,
  bests: Sequelize.JSONB,
  zones: Sequelize.JSONB,
  started_at: Sequelize.DATE,
  stopped_at: Sequelize.DATE
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'workouts' // We need to choose the model name
});


Workout.light = function () {
  return ['source', 'sourceId', 'bests', 'zones', 'createdAt', 'streams', 'updatedAt', 'geom']
}

Workout.getEffortToday = async function (date) {
  start = moment(date.set({ 'hour': 0, 'minute': 0, 'seconds': 0 }).toISOString())
  end = moment(date.set({ 'hour': 23, 'minute': 59, 'seconds': 59 }).toISOString())
  let effort = 0
  try {
    const workouts = await Workout.findAll({
      where: {
        "started_at": {
          [Op.and]: {
            [Op.gte]: start,
            [Op.lte]: date
          }
        }
      }
    })
    for (const workout of workouts) {
      if (workout.effort) {
        effort += workout.effort
      } else if (workout.hr_effort) {
        effort += workout.hr_effort
      }
    }
  } catch (e) { }
  return effort
}
Workout.getTrainingLoadYesterday = async function (date, daysToInclude = 42) {
  date = moment(date.toISOString()).subtract(1, 'days')
  const start = moment(date.toISOString()).subtract(daysToInclude, 'days')
  let fitness = 0
  try {
    const workouts = await Workout.findAll({
      where: {
        "started_at": {
          [Op.and]: {
            [Op.gte]: start.toISOString(),
            [Op.lte]: date.toISOString()
          }
        }
      }
    })
    for (const workout of workouts) {
      if (workout.effort) {
        fitness += workout.effort
      } else if (workout.hr_effort) {
        fitness += workout.hr_effort
      }
    }
    fitness = fitness / daysToInclude
  } catch (e) { }
  return Math.round(fitness)
}

Workout.getTrainingLoad = async function (date, daysToInclude = 42) {
  const yesterdayTrainingLoad = await Workout.getTrainingLoadYesterday(moment(date.toISOString()), daysToInclude)
  const todayEffort = await Workout.getEffortToday(moment(date.toISOString()))
  const start = moment(date.toISOString()).subtract(daysToInclude, 'days')
  let trainingLoad = 0
  try {
    const workouts = await Workout.findAll({
      where: {
        "started_at": {
          [Op.and]: {
            [Op.gte]: start.toISOString(),
            [Op.lte]: date.toISOString()
          }
        }
      }
    })
    for (const workout of workouts) {
      if (workout.effort) {
        trainingLoad += workout.effort
      } else if (workout.hr_effort) {
        trainingLoad += workout.hr_effort
      }
    }
    // CTLtoday = CTLyesterday + (TSStoday - CTLyesterday)(1/CTL time constant)
    trainingLoad = yesterdayTrainingLoad + ((todayEffort - yesterdayTrainingLoad) / daysToInclude)
  } catch (e) { }
  return Math.round(trainingLoad)
}

Workout.buildZoneDistribution = function (watts, heartrate, hrZones, powerZones) {
  const listLength = watts?.length || heartrate?.length
  const zones = {
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
  }

  //Determine if watts and or heart rate is present
  if (watts && watts.length > 0) {
    zones.hasWatts = true
  } if (heartrate && heartrate.length > 0) {
    zones.hasHeartRate = true
  }
  for (var i = 0; i < listLength; i++) {

    //Get watt seconds for particular zones
    if (watts && watts.length > 0 && powerZones) {
      const value = _.find(powerZones, (item) => {
        return watts[i] >= item.low && (watts[i] <= item.high || item.title == 'Anaerobic')
      })
      if (value) {
        zones[value.title]['watt-seconds'] += 1
        zones[value.title]['watt-percentage'] = Math.round((zones[value.title]['watt-seconds'] / listLength) * 100) / 100
      }
    }

    //Get hr seconds for particular zones
    if (heartrate && heartrate.length > 0 && hrZones) {
      const value = _.find(hrZones, (item) => {
        return heartrate[i] >= item.low && (heartrate[i] <= item.high || item.title == 'VO2 Max')
      })
      if (value) {
        zones[value.title]['hr-seconds'] += 1
        zones[value.title]['hr-percentage'] = Math.round((zones[value.title]['hr-seconds'] / listLength) * 100) / 100
      }
    }
  }
  return zones
}

buildStats = function (bests, list, listName, i, seconds, timeSliceName) {
  const timeSlice = list.slice(i, seconds + i) //slice hr/watt array by time range
  const sum = _.sum(timeSlice) // sum that time range
  const average = sum / timeSlice.length // get average of time range
  if (average > bests[listName][timeSliceName]) {  // if the averaged time range is greater than what is present, replace.
    bests[listName][timeSliceName] = Math.round(average)
  }
}

Workout.getBests = function (stream, hrZones, powerZones) {
  const heartrate = stream.heartrate?.data ?? []
  const watts = stream.watts?.data ?? []
  const listLength = heartrate?.length || watts?.length
  const bests = {
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
  if (watts.length > 0) {
    bests.hasWatts = true
  } if (heartrate.length > 0) {
    bests.hasHeartRate = true
  }
  try {
    for (let i = 0; i < listLength; i++) {
      //1hr
      if ((i + 3600) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 3600, '1hr')
        }
        if (heartrate.length == listLength) {
          buildStats(bests, heartrate, 'heartrate', i, 3600, '1hr')
        }
      }

      //20min
      if ((i + 1200) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 1200, '20min')
        }
        if (heartrate.length == listLength) {
          buildStats(bests, heartrate, 'heartrate', i, 1200, '20min')
        }
      }

      //10min
      if ((i + 600) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 600, '10min')
        }
        if (heartrate.length == listLength) {
          buildStats(bests, heartrate, 'heartrate', i, 600, '10min')
        }
      }

      //5min
      if ((i + 300) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 300, '5min')
        }
        if (heartrate.length == listLength) {
          buildStats(bests, heartrate, 'heartrate', i, 300, '5min')
        }
      }

      //2min
      if ((i + 120) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 120, '2min')
        }
      }

      //1min
      if ((i + 60) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 60, '1min')
        }
      }

      //30sec
      if ((i + 30) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 30, '30sec')
        }
      }

      //5sec
      if ((i + 5) < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 5, '5sec')
        }
      }

      //max
      if (i + 1 < listLength) {
        if (watts.length == listLength) {
          buildStats(bests, watts, 'watts', i, 1, 'max')
        }
        if (heartrate.length == listLength) {
          buildStats(bests, heartrate, 'heartrate', i, 1, 'max')
        }
      }
    }
  } catch (e) {
    console.log(e)
  }

  return bests
}

Workout.findHRTSS = function (actor, heartrates) {
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



module.exports = Workout