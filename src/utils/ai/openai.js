import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: './config/.env' });

export const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL
});