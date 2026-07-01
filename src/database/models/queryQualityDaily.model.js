import { DataTypes } from 'sequelize';

export default function QueryQualityDailyModel(sequelize) {
    const model = sequelize.define(
        'QueryQualityDaily',
        {
            project_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            environment_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            audit_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            total_audited_queries: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            normal_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            needs_review_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            unresolved_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            low_confidence_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            negative_feedback_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            average_retrieval_score: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
        },
        {
            tableName: 'v_query_quality_daily',
            timestamps: false,
        }
    );

    model.removeAttribute('id');
    return model;
}
