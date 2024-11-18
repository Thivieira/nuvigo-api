import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API Keys from environment variables
const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TOMORROW_API_KEY || !OPENAI_API_KEY) {
  throw new Error('Missing required API keys in environment variables.');
}

export { TOMORROW_API_KEY, OPENAI_API_KEY };
