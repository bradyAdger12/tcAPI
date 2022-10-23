const sequelize = require('../database.js')
const { Sequelize, Model } = require('sequelize');
const Workout = require('./workout.js')

class User extends Model {
}

User.prototype.getPRs = function (workoutBests) {
  const prs = []
  const timeRanges = [
    "1hr",
    "20min",
    "10min",
    "5min",
    "2min",
    "1min",
    "30sec",
    "5sec",
    "max",
  ]

  for (const time of timeRanges) {
    if (workoutBests && workoutBests['watts']) {
      if (workoutBests['watts'][time] >= this.bests['watts'][time]) {
        prs.push({ type: 'watts', time: time, value: workoutBests['watts'][time] })
      }
    }
    if (workoutBests && workoutBests['heartrate']) {
      if (workoutBests['heartrate'][time] >= this.bests['heartrate'][time]) {
        prs.push({ type: 'heartrate', time: time, value: workoutBests['heartrate'][time] })
      }
    }
  }

  //Determine if user fitness benchmarks should be increased
  if (workoutBests?.hasHeartRate && workoutBests['heartrate']['max'] > this.max_hr) {
    this.max_hr = workoutBests['heartrate']['max']
    prs.unshift({ type: 'heartrate', value: this.max_hr, name: 'Max HR' })
  }
  if (workoutBests?.hasHeartRate && workoutBests['heartrate'] && ((workoutBests['heartrate']['20min'] + workoutBests['heartrate']['10min']) / 2) * .95 > this.threshold_hr) {
    this.threshold_hr = Math.round(((workoutBests['heartrate']['20min'] + workoutBests['heartrate']['10min']) / 2) * .95)
    this.hr_zones = User.getHeartRateZones(this.threshold_hr)
    prs.unshift({ type: 'heartrate', value: this.threshold_hr, name: 'Threshold HR' })
  }
  if (workoutBests?.hasWatts && workoutBests['watts'] && (workoutBests['watts']['20min'] * .95) > this.threshold_power) {
    this.threshold_power = Math.round(workoutBests['watts']['20min'] * .95)
    this.power_zones = User.getPowerZones(this.threshold_power)
    prs.unshift({ type: 'watts', value: this.threshold_power, name: 'FTP' })
  }
  return prs
}

User.getHeartRateZones = function (max_hr, thresh_hr) {
  let cycling_hr_zones = []
  let running_hr_zones = []
  if (thresh_hr) {
    cycling_hr_zones = [
      { title: 'Recovery', low: 0, high: Math.round(thresh_hr * .68) },
      { title: 'Endurance', low: Math.round(thresh_hr * .68) + 1, high: Math.round(thresh_hr * .83) },
      { title: 'Tempo', low: Math.round(thresh_hr * .83) + 1, high: Math.round(thresh_hr * .94) },
      { title: 'Threshold', low: Math.round(thresh_hr * .94) + 1, high: Math.round(thresh_hr * 1.05) },
      { title: 'VO2 Max', low: Math.round(thresh_hr * 1.05) + 1, high: 'MAX' }
    ]
  }
  if (max_hr) {
    running_hr_zones = [
      { title: 'Recovery', low: 0, high: Math.round(max_hr * .72) },
      { title: 'Endurance', low: Math.round(max_hr * .72) + 1, high: Math.round(max_hr * .80) },
      { title: 'Tempo', low: Math.round(max_hr * .80) + 1, high: Math.round(max_hr * .87) },
      { title: 'Threshold', low: Math.round(max_hr * .87) + 1, high: Math.round(max_hr * .93) },
      { title: 'VO2 Max', low: Math.round(max_hr * .93) + 1, high: max_hr }
    ]
  }

  return {
    ride: cycling_hr_zones,
    run: running_hr_zones
  }
}
User.getPowerZones = function (thresh_power) {
  if (thresh_power) {
    return [
      { title: 'Recovery', low: 0, high: Math.round(thresh_power * .54) },
      { title: 'Endurance', low: Math.round(thresh_power * .54) + 1, high: Math.round(thresh_power * .75) },
      { title: 'Tempo', low: Math.round(thresh_power * .75) + 1, high: Math.round(thresh_power * .90) },
      { title: 'Threshold', low: Math.round(thresh_power * .90) + 1, high: Math.round(thresh_power * 1.05) },
      { title: 'VO2 Max', low: Math.round(thresh_power * 1.05) + 1, high: Math.round(thresh_power * 1.20) },
      { title: 'Anaerobic', low: Math.round(thresh_power * 1.20) + 1, high: 'MAX' }
    ]
  }
  return []
}

User.formatUser = function (user, actor) {
  try {
    user = user.get({ plain: true })
  } catch (e) { }

  //Never return password or email
  delete user.password
  delete user.email
  delete user.iat

  //Return set of fields if user != actor
  if (user && actor && user.id != actor.id) {
    delete user.id
    delete user.hr_zones
    delete user.power_zones
    delete user.max_hr
    delete user.threshold_hr
    delete user.threshold_power
    delete user.strava_token
    delete user.garmin_token
    delete user.strava_enable_auto_sync
    delete user.garmin_enable_auto_sync
    delete user.createdAt
    delete user.updatedAt
  }
  return user
}

User.init({
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  password: { type: Sequelize.STRING, allowNull: false },
  email: { type: Sequelize.STRING, allowNull: false },
  display_name: { type: Sequelize.STRING, allowNull: false },
  gender: Sequelize.STRING,
  bests: { type: Sequelize.JSONB, defaultValue: {} },
  hr_zones: { type: Sequelize.JSONB, defaultValue: [] },
  power_zones: { type: Sequelize.JSONB, defaultValue: [] },
  max_hr: Sequelize.INTEGER,
  resting_hr: Sequelize.INTEGER,
  threshold_hr: Sequelize.INTEGER,
  threshold_power: Sequelize.INTEGER,
  running_threshold_pace: Sequelize.INTEGER,
  strava_token: Sequelize.STRING,
  garmin_token: Sequelize.STRING,
  strava_enable_auto_sync: { type: Sequelize.BOOLEAN, defaultValue: false },
  garmin_enable_auto_sync: { type: Sequelize.BOOLEAN, defaultValue: false }
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'users' // We need to choose the model name
});

User.hasMany(Workout, { constraints: false, foreignKey: 'user_id' })
Workout.belongsTo(User, { foreignKey: 'user_id' })
// Workout.hasOne(User)



module.exports = User