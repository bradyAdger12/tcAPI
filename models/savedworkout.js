'use strict';
const {
  Model, Sequelize
} = require('sequelize');
const sequelize = require('../database.js')

class SavedWorkout extends Model {
}
SavedWorkout.init({
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  workout: Sequelize.JSONB,
  name: Sequelize.STRING,
  description: Sequelize.STRING,
  userId: Sequelize.INTEGER,
  activity: Sequelize.STRING,
  tss: Sequelize.INTEGER,
  hrTss: Sequelize.INTEGER
}, {
  sequelize,
  modelName: 'saved_workouts',
});

module.exports = SavedWorkout