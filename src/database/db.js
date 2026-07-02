import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ path: './config/.env' });
const databaseProvider = process.env.DATABASE;

let conf = {};
conf.timezone = process.env.TIMEZONE || 'UTC';
switch (databaseProvider) {
  case 'supabase':
    // Set up Supabase configuration
    conf.host = process.env.SUPABASE_HOST;
    conf.port = process.env.SUPABASE_PORT;
    conf.database = process.env.SUPABASE_DATABASE;
    conf.user = process.env.SUPABASE_USER;
    conf.password = process.env.SUPABASE_PASSWORD;
    break;
  case 'postgres':
    // Set up PostgreSQL configuration
    break;
  default:
    throw new Error('Unsupported DATABASE provider');
}

const sequelize = new Sequelize(conf.database, conf.user, conf.password, {
  dialect: 'postgres',
  host: conf.host,
  port: conf.port,
  timezone: conf.timezone,
  logging: false,
  alter: false
});

//model initialization
import { initModels } from './models/index.model.js';
const models = initModels(sequelize);

const db = {};
db.testConnection = async function() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to Supabase PostgreSQL via Sequelize!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

db.ensureChatMessageConfidenceColumns = async function() {
  await sequelize.query(`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS low_confidence BOOLEAN NOT NULL DEFAULT false
  `);

  await sequelize.query(`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS confidence_reasons JSONB
  `);
}

db.ensureProjectTopicProjectIdColumn = async function() {
  await sequelize.query(`
    DO $$
    DECLARE
      project_id_type TEXT;
      topic_count INTEGER;
    BEGIN
      SELECT data_type
      INTO project_id_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'project_topics'
        AND column_name = 'project_id';

      IF project_id_type = 'uuid' THEN
        SELECT COUNT(*) INTO topic_count FROM project_topics;

        IF topic_count > 0 THEN
          RAISE EXCEPTION 'project_topics.project_id is uuid but projects.id is bigint; clear or migrate existing topic rows before startup can convert the column';
        END IF;

        ALTER TABLE project_topics
        ALTER COLUMN project_id TYPE BIGINT
        USING NULL;
      END IF;
    END $$;
  `);
}

export { sequelize, models, db };
