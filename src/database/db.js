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

export { sequelize, models, db };