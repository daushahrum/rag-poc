import { DataTypes } from 'sequelize';

export default function ChatResponseAuditsModel(sequelize) {
    return sequelize.define(
        'ChatResponseAudits',
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            project_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            environment_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            chat_session_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            message_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            retrieval_score: {
                type: DataTypes.DECIMAL,
                allowNull: true,
            },
            retrieved_chunk_count: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            confidence_level: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'unknown',
            },
            quality_status: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'normal',
            },
            user_feedback: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            user_feedback_reason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            user_feedback_note: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            audit_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            topic: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            reviewed_by: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            reviewed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            user_message_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            jira_issue_key: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            jira_issue_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            jira_created_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            jira_created_by: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'chat_response_audits',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );
}
