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
    'duration': 0,
    'distance': 0,
    'fitness': 0,
    'fatigue': 0,
    'form': 0,
    'workoutIds': []
  }
  for (const workout of workouts) {
    if (workout.effort) {
      summary['effort'] += workout.effort
    } else if (workout.hr_effort) {
      summary['effort'] += workout.hr_effort
    }
    summary['duration'] += workout.duration
    summary['distance'] += workout.length
    summary['workoutIds'].push(workout.id)
  }
  summary['fitness'] = await Workout.getTrainingLoad(actor, moment(endDate.toISOString()))
  summary['fatigue'] = await Workout.getTrainingLoad(actor, moment(endDate.toISOString()), 7)
  const yesterdayFitness = await Workout.getTrainingLoad(actor, moment(endDate).subtract(1, 'days').endOf('day'))
  const yesterdayFatigue = await Workout.getTrainingLoad(actor, moment(endDate).subtract(1, 'days').endOf('day'), 7)

  summary['form'] = Math.round(yesterdayFitness - yesterdayFatigue)
  return summary
}

module.exports = getSummary