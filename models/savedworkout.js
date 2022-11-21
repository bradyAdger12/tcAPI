'use strict';
const {
  Model, Sequelize
} = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  class SavedWorkout extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SavedWorkout.init({
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    workout: DataTypes.JSONB,
    
  }, {
    sequelize,
    modelName: 'saved_workouts',
  });
  return SavedWorkout;
};