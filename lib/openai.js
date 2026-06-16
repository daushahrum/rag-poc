import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: './config/.env' });

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});