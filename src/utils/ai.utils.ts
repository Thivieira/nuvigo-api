import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { env } from '@/env';
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function generateChatTitle(messages: ChatCompletionMessageParam[]): Promise<string> {
  const systemPrompt = `You are a helpful assistant that generates concise, descriptive titles for chat conversations.
  The title should be:
  - Maximum 50 characters
  - Capture the main topic or theme of the conversation
  - Be clear and specific
  - Avoid generic terms like "Chat" or "Conversation"
  - Use title case
  Return ONLY the title, with no additional text or explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'Chat Session';
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'Chat Session';
  }
} 