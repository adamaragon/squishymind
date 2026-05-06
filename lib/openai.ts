import OpenAI from 'openai';

// SERVER-ONLY. Never import from a client component.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
