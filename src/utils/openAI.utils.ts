import { OpenAI } from 'openai';
import { env } from '@/env';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const createOpenAIResponse = async (
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> => {
  console.log('Sending messages to OpenAI API');

  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    max_tokens: 500,
  });

  console.log('Received response from OpenAI API');
  const response = gptResponse.choices[0].message?.content?.trim() || '';
  console.log('OpenAI response content:', response);

  return response;
};

export { createOpenAIResponse };
