const sequelize = require('../database.js')
const { Sequelize, Model } = require('sequelize');
const Recording = require('./recording.js')

class User extends Model {
}

User.getPowerZones = function () {
  return []
}
User.getHeartRateZones = function (thresh_hr) {
  if (thresh_hr) {
    return [{ title: 'Recovery', low: 0, high: Math.round(thresh_hr * .68) }, { title: 'Endurance', low: Math.round(thresh_hr * .69), high: Math.round(thresh_hr * .83) }, { title: 'Tempo', low: Math.round(thresh_hr * .84), high: Math.round(thresh_hr * .94) }, { title: 'Threshold', low: Math.round(thresh_hr * .95), high: Math.round(thresh_hr * 1.05) }, { title: 'VO2 Max', low: Math.round(thresh_hr * 1.06), high: 'MAX' }]
  }
  return []
}
User.getPowerZones = function (thresh_power) {
  if (thresh_power) {
    return [{ title: 'Recovery', low: 0, high: Math.round(thresh_power * .54) }, { title: 'Endurance', low: Math.round(thresh_power * .55), high: Math.round(thresh_power * .75) }, { title: 'Tempo', low: Math.round(thresh_power * .76), high: Math.round(thresh_power * .90) }, { title: 'Threshold', low: Math.round(thresh_power * .91), high: Math.round(thresh_power * 1.05) }, { title: 'VO2 Max', low: Math.round(thresh_power * 1.06), high: Math.round(thresh_power * 1.20) }, { title: 'Anaerobic', low: Math.round(thresh_power * 1.20), high: 'MAX' }]
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
  hr_zones: { type: Sequelize.JSONB, defaultValue: [] },
  power_zones: { type: Sequelize.JSONB, defaultValue: [] },
  max_hr: Sequelize.INTEGER,
  resting_hr: Sequelize.INTEGER,
  threshold_hr: Sequelize.INTEGER,
  threshold_power: Sequelize.INTEGER,
  strava_token: Sequelize.STRING,
  garmin_token: Sequelize.STRING,
  strava_enable_auto_sync: { type: Sequelize.BOOLEAN, defaultValue: false },
  garmin_enable_auto_sync: { type: Sequelize.BOOLEAN, defaultValue: false }
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'users' // We need to choose the model name
});

User.hasMany(Recording, { constraints: false, foreignKey: 'user_id' })
// Recording.hasOne(User)



module.exports = User