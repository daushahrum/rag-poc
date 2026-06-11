import UserModel from './user.model.js';

export function initModels(sequelize) {
    const models = {
        User: UserModel(sequelize),
    };

    Object.values(models).forEach((m) => {
        if (typeof m.associate === 'function') m.associate(models);
    });

    return models;
}