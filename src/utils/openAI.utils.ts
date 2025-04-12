import { OpenAI } from 'openai';
import { env } from '@/env';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const createOpenAIResponse = async (
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletion> => {
  console.log('Sending messages to OpenAI API');

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    max_tokens: 500,
  });

  console.log('Received response from OpenAI API');
  return gptResponse;
};
