'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('saved_workouts', 'activity', {
          type: Sequelize.DataTypes.STRING
        }, { transaction: t }),
        queryInterface.addColumn('saved_workouts', 'name', {
          type: Sequelize.DataTypes.STRING,
        }, { transaction: t }),
        queryInterface.addColumn('saved_workouts', 'description', {
          type: Sequelize.DataTypes.STRING,
        }, { transaction: t })
      ]);
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('saved_workouts', 'activity', { transaction: t }),
        queryInterface.removeColumn('saved_workouts', 'name', { transaction: t }),
        queryInterface.removeColumn('saved_workouts', 'description', { transaction: t })
      ]);
    });
  }
};
