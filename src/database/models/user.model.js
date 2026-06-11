import { DataTypes } from 'sequelize';

export default function UserModel(sequelize) {
    return sequelize.define(
        'User',
        {
            id: { type: DataTypes.TEXT, primaryKey: true, allowNull: false },
            password: { type: DataTypes.TEXT, allowNull: false },
            role: { type: DataTypes.TEXT, allowNull: false },
            name: { type: DataTypes.TEXT, allowNull: false },
            active: { type: DataTypes.BOOLEAN, allowNull: false },
            mobile: { type: DataTypes.TEXT, allowNull: false },
            email: { type: DataTypes.TEXT, allowNull: false },
            retries: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
            last_login_at: { type: DataTypes.DATE, allowNull: true },
            last_password_changed_at: { type: DataTypes.DATE, allowNull: true },
            reset_password_token: { type: DataTypes.TEXT, allowNull: true },
            session_id: { type: DataTypes.TEXT, allowNull: true },
            created_by: { type: DataTypes.TEXT, allowNull: false },
            updated_by: { type: DataTypes.TEXT, allowNull: false },
            project_id: { type: DataTypes.TEXT, allowNull: true },
            is_developer: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
        },
        {
            tableName: 'users',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}