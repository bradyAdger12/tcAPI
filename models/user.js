const sequelize = require('../database.js')
const { Sequelize, Model } = require('sequelize');
const Recording = require('./recording.js')

class User extends Model {
}

User.formatUser = function (user, actor) {
  try {
    user = user.get({ plain: true })
  } catch (e) {}

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
  hr_zones: { type: Sequelize.ARRAY(Sequelize.INTEGER), defaultValue: [] },
  power_zones: { type: Sequelize.ARRAY(Sequelize.INTEGER), defaultValue: [] },
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