import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '../config';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const createOpenAIResponse = async (prompt: string): Promise<string> => {
  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
  });

  return gptResponse.choices[0].message?.content?.trim() || '';
};

export { createOpenAIResponse };
