const Workout = require('../models/workout.js')
const { Op } = require('sequelize')
const moment = require('moment')
getSummary = async function (actor, startDate, endDate) {
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
    attributes: { exclude: Workout.light() }
  })
  let summary = {
    'effort': 0,
    'total_duration': 0,
    'activity_duration': {
      'run': 0,
      'cycling': 0,
      'workout': 0
    },
    'total_distance': 0,
    'activity_distance': {
      'run': 0,
      'cycling': 0
    },
    'fitness': 0,
    'fatigue': 0,
    'form': 0,
    'workoutIds': []
  }
  for (const workout of workouts) {
    if (workout.planned && !workout.is_completed && moment().endOf('day').isAfter(moment(workout.started_at).endOf('day'))) {
      continue
    }
    if (workout.effort) {
      summary['effort'] += workout.effort
    } else if (workout.hr_effort) {
      summary['effort'] += workout.hr_effort
    }

    //Add Duration
    summary['total_duration'] += workout.duration
    if (workout.activity == 'run') {
      summary['activity_duration']['run'] += workout.duration
    }
    else if (workout.activity == 'ride') {
      summary['activity_duration']['cycling'] += workout.duration
    }
    else if (workout.activity == 'workout') {
      summary['activity_duration']['workout'] += workout.duration
    }

    //Add Distance
    summary['total_distance'] += workout.length
    if (workout.activity == 'run') {
      summary['activity_distance']['run'] += workout.length
    }
    else if (workout.activity == 'ride') {
      summary['activity_distance']['cycling'] += workout.length
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