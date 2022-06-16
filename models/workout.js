const sequelize = require('../database.js')
const { Sequelize, Model, Op } = require('sequelize');
const _ = require('lodash')
const moment = require('moment')
const User = require('./user.js')

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
  source_id: { type: Sequelize.STRING },
  user_id: Sequelize.INTEGER,
  geom: { type: Sequelize.GEOMETRY("MultiLineString", 4326) },
  hr_effort: Sequelize.INTEGER,
  effort: Sequelize.INTEGER,
  streams: Sequelize.JSONB,
  bests: Sequelize.JSONB,
  zones: Sequelize.JSONB,
  is_completed: { type: Sequelize.BOOLEAN, defaultValue: true },
  planned: Sequelize.JSONB,
  started_at: Sequelize.DATE,
  stopped_at: Sequelize.DATE
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'workouts' // We need to choose the model name
});

interpolateStreams = function (streams) {
  if (streams.time) {
    const fitCount = streams.time.data[streams.time.data.length - 1]
    if (streams.heartrate) {
      const heartrateArray = interpolateArray(streams.heartrate.data, fitCount)
      streams.heartrate.data = heartrateArray
    } if (streams.watts) {
      const wattsArray = interpolateArray(streams.watts.data, fitCount)
      streams.watts.data = wattsArray
    }
  }
  return streams
}



Workout.createWorkout = async ({ actor, name, description, duration, length, source, source_id, started_at, normalizedPower, streams, activity, planned, is_completed = true }) => {
  let zones = null
  let bests = null
  let hrtss = null
  let tss = null
  if (streams) {
    streams = interpolateStreams(streams)
    zones = Workout.buildZoneDistribution(streams.watts?.data, streams.heartrate?.data, actor.hr_zones, actor.power_zones)
    bests = Workout.getBests(actor, streams.heartrate?.data, streams.watts?.data)
  }
  if (normalizedPower && actor.threshold_power) {
    tss = Math.round(((duration * (normalizedPower * (normalizedPower / actor.threshold_power)) / (actor.threshold_power * 3600))) * 100)
  }
  if (streams.heartrate?.data) {
    hrtss = Workout.findHRTSS(actor, streams.heartrate?.data)
    hrtss = Math.round(hrtss * 100)
  }

  //Check if workout already exists in DB
  const workout = await Workout.findOne({
    where: {
      user_id: actor.id,
      source_id: source_id
    },
    attributes: { exclude: Workout.light() }
  })
  if (workout) {
    throw Error('Workout already exists!')
  }

  //Check if there is a planned workout on same day
  const ended_at = moment(started_at).endOf('day')
  started_at = moment(started_at)
  const plannedWorkout = await Workout.findOne({
    where: {
      planned: {
        [Op.ne]: null
      },
      is_completed: false,
      user_id: actor.id,
      "started_at": {
        [Op.and]: {
          [Op.gte]: started_at.toISOString(),
          [Op.lte]: ended_at.toISOString()
        }
      }
    },
    attributes: { exclude: Workout.light() }
  })
  if (plannedWorkout && is_completed) {
    plannedWorkout.name = name
    plannedWorkout.length = length
    plannedWorkout.hr_effort = hrtss
    plannedWorkout.effort = tss
    plannedWorkout.description = description
    plannedWorkout.source = source
    plannedWorkout.source_id = source_id
    plannedWorkout.bests = bests
    plannedWorkout.zones = zones
    plannedWorkout.streams = streams
    plannedWorkout.duration = duration
    plannedWorkout.is_completed = true
    plannedWorkout.started_at = started_at.toISOString()
    await plannedWorkout.save()
    return plannedWorkout
  }

  // Create workout entry
  let newWorkout = await Workout.create({
    name: name,
    length: length,
    hr_effort: hrtss,
    effort: tss,
    description: description,
    source: source,
    activity: activity,
    source_id: source_id,
    bests: bests,
    zones: zones,
    streams: streams,
    duration: duration,
    is_completed: is_completed,
    planned: planned,
    started_at: started_at,
    user_id: actor.id
  })
  newWorkout = newWorkout.toJSON()
  if (newWorkout) {
    actor.changed('bests', true)
    const prs = actor.getPRs(bests)
    newWorkout.prs = prs
    await actor.save()
  }
  return newWorkout

}


Workout.light = function () {
  return ['source', 'sourceId', 'bests', 'zones', 'createdAt', 'streams', 'updatedAt', 'geom']
}

const average = function (array) {
  let sum = 0
  for (const item of array) {
    sum += item
  }
  return sum / array.length
}

Workout.getNormalizedPower = function (watts) {
  const averages = []
  if (watts) {
    for (let index = 0; index + 30 < watts.length; index++) {
      const thirtySecondSlice = watts.slice(index, index + 30)
      averages.push(Math.round(Math.pow(average(thirtySecondSlice), 4)))
    }
  }
  const fourthPowerAverages = average(averages)
  return Math.round(Math.pow(fourthPowerAverages, .25))
}

Workout.getTrainingLoad = async function (actor, date, daysToInclude = 42) {
  const start = moment(date.toISOString()).utc().subtract(daysToInclude, 'days')
  date = date.utc()
  let trainingLoad = 0
  let todaysEffort = 0
  let count = 1
  try {
    const workouts = await Workout.findAll({
      where: {
        user_id: actor.id,
        "started_at": {
          [Op.and]: {
            [Op.gte]: start.toISOString(),
            [Op.lte]: date.toISOString()
          }
        }
      }
    })
    while (start.format('D MMMM YYYY') != date.format('D MMMM YYYY')) {
      for (const workout of workouts) {
        if (moment(workout.started_at).format('D MMMM YYYY') == start.format('D MMMM YYYY')) {

          //Dont add incomplete workouts to training load numbers
          if (workout.planned && !workout.is_completed && moment().endOf('day').isAfter(moment(workout.started_at).endOf('day'))) {
            continue
          }
          if (workout.effort) {
            todaysEffort += workout.effort
          } else if (workout.hr_effort) {
            todaysEffort += workout.hr_effort
          }
        }
      }
      // (1/7) x (1-1/7)^1 = 12.2%
      const weight = ((1 / daysToInclude) * Math.pow((1 - (1 / daysToInclude)), daysToInclude - count))
      trainingLoad += todaysEffort * (1 - weight)
      todaysEffort = 0
      start.add(1, 'days')
      count += 1
    }
  } catch (e) { }
  return Math.round(trainingLoad / daysToInclude)
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

Workout.getBests = function (actor, heartrateStream, wattsStream) {
  const heartrate = heartrateStream ?? []
  const watts = wattsStream ?? []
  const listLength = heartrate?.length || watts?.length
  const bests = actor.bests ?? {
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

    // Determine if workouts bests are greater than exisiting user bests
    for (let [key, value] of Object.entries(bests['watts'])) {
      if (bests['watts'][key] > actor.bests['watts'][key]) {
        actor.bests['watts'][key] = value
      }
    }

    for (let [key, value] of Object.entries(bests['heartrate'])) {
      if (bests['heartrate'][key] > actor.bests['heartrate'][key]) {
        actor.bests['heartrate'][key] = value
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