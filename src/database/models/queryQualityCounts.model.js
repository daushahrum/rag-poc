import { DataTypes } from 'sequelize';

export default function QueryQualityCountsModel(sequelize) {
    const model = sequelize.define(
        'QueryQualityCounts',
        {
            project_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            environment_id: {
                type: DataTypes.STRING,
                allowNull: true,
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
            high_confidence_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            medium_confidence_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            low_confidence_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            unknown_confidence_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            positive_feedback_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            negative_feedback_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            no_feedback_count: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            average_retrieval_score: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
            latest_audit_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'v_query_quality_counts',
            timestamps: false,
        }
    );

    model.removeAttribute('id');
    return model;
}
