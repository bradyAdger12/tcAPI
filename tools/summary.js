const Workout = require('../models/workout.js')
const { Op } = require('sequelize')
const moment = require('moment')
getSummary = async function (actor, startDate, endDate) {
  const validActivities = ['run', 'bike', 'swim']
  let workouts = await Workout.findAll({
    order: [
      ['started_at', 'DESC']],
    where: {
      user_id: actor.id,
      "started_at": {
        [Op.and]: {
          [Op.gte]: startDate.toISOString(),
          [Op.lte]: endDate.toISOString()
        }
      }
    },
    attributes: { exclude: Workout.light().filter((item) => item !== 'zones') }
  })
  let summary = {
    'effort': 0,
    'total_duration': 0,
    'activity_duration': {
      'run': 0,
      'ride': 0,
      'workout': 0,
      'swim': 0
    },
    'total_distance': 0,
    'activity_distance': {
      'run': 0,
      'ride': 0,
      'swim': 0
    },
    'fitness': 0,
    'fatigue': 0,
    'form': 0,
    'zoneDistribution': {
      'Recovery': 0,
      'Endurance': 0,
      'Tempo': 0,
      'Theshold': 0,
      'VO2 Max': 0,
      'Anaerobic': 0
    },
    'workoutIds': []
  }
  for (const workout of workouts) {
    if (workout.zones && validActivities.includes(workout.activity)) {
      for (const key of Object.keys(workout.zones)) {
        if (key !== 'hasHeartRate' && key !== 'hasWatts') {
          const value = workout.zones[key]
          const preferredMetric = value['watt-seconds'] ? value['watt-seconds'] : value['hr-seconds']
          if (preferredMetric) {
            summary['zoneDistribution'][key] += preferredMetric
          }
        }
      }
    }

    // Skip planned workouts that have not been completed
    // if (workout.planned && !workout.is_completed && moment().endOf('day').isAfter(moment(workout.started_at).endOf('day'))) {
    //   continue
    // }
    if (workout.effort) {
      summary['effort'] += workout.effort
    } else if (workout.hr_effort) {
      summary['effort'] += workout.hr_effort
    }

    // Add Duration
    summary['total_duration'] += workout.duration
    if (workout.activity == 'run') {
      summary['activity_duration']['run'] += workout.duration
    }
    else if (workout.activity == 'ride') {
      summary['activity_duration']['ride'] += workout.duration
    }
    else if (workout.activity == 'workout') {
      summary['activity_duration']['workout'] += workout.duration
    } 
    else if (workout.activity == 'swim') {
      summary['activity_duration']['swim'] += workout.duration
    }

    //Add Distance
    summary['total_distance'] += workout.length
    if (workout.activity == 'run') {
      summary['activity_distance']['run'] += workout.length
    }
    else if (workout.activity == 'ride') {
      summary['activity_distance']['ride'] += workout.length
    }
    else if (workout.activity == 'swim') {
      summary['activity_distance']['swim'] += workout.length
    }
    summary['workoutIds'].push(workout.id)
  }
  summary['fitness'] = await Workout.getTrainingLoad(actor, moment(endDate.toISOString()))
  summary['fatigue'] = await Workout.getTrainingLoad(actor, moment(endDate.toISOString()), 7)
  const yesterdayFitness = await Workout.getTrainingLoad(actor, moment(endDate).subtract(1, 'days').endOf('day'))
  const yesterdayFatigue = await Workout.getTrainingLoad(actor, moment(endDate).subtract(1, 'days').endOf('day'), 7)
  summary['form'] = Math.round(yesterdayFitness - yesterdayFatigue)
  summary['startDate'] = startDate,
   summary['endDate'] = endDate
  return summary
}

module.exports = getSummary