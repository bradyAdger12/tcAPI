'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('saved_workouts', 'tss', {
          type: Sequelize.DataTypes.INTEGER
        }, { transaction: t }),
        queryInterface.addColumn('saved_workouts', 'hrTss', {
          type: Sequelize.DataTypes.INTEGER
        }, { transaction: t })
      ]);
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('saved_workouts', 'tss', { transaction: t }),
        queryInterface.removeColumn('saved_workouts', 'hrTss', { transaction: t })
      ]);
    });
  }
};
