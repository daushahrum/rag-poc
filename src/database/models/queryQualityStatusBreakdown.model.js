import { DataTypes } from 'sequelize';

export default function QueryQualityStatusBreakdownModel(sequelize) {
    const model = sequelize.define(
        'QueryQualityStatusBreakdown',
        {
            project_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            environment_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            quality_status: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            query_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
        },
        {
            tableName: 'v_query_quality_status_breakdown',
            timestamps: false,
        }
    );

    model.removeAttribute('id');
    return model;
}
