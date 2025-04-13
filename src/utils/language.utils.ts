import dayjs from 'dayjs';
import { Chat, ChatSession } from '@prisma/generated/client';
import { createOpenAIResponse } from './openAI.utils';
import { ChatService } from '@/services/chat.service';
import { OpenAI } from 'openai';

export interface PromptParams {
  name: string;
  temperature: number;
  description: string;
  condition: {
    humidity: number;
    windSpeed: number;
    cloudCover: number;
    precipitationProbability: number;
    uvIndex: number;
  };
  timeOfDay: string;
  isFuture: boolean;
  targetDate: string;
  targetTime: string;
  precipitationIntensity?: number;
  query: string;
  explanation?: string;
}

export interface WeatherAnalysis {
  naturalResponse: string;
  analyzedTemperature?: number;
  sessionId: string;
  dateAnalysis?: string;
}

async function buildMessagesWithHistory(
  params: PromptParams,
  history: Chat[],
  language: string
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
  const { name, temperature, description, condition, timeOfDay, isFuture, targetDate, targetTime, precipitationIntensity, query, explanation } = params;

  const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
    role: 'system',
    content: `You are Nuvigo, an AI weather assistant. Your language for the response must be ${language}. You provide helpful, friendly, and conversational responses about weather conditions. You have access to both current and future weather data (up to 5 days ahead). Follow these instructions carefully:
      1. Respond directly to the question asked clearly and objectively.
      2. Maintain a professional but accessible tone.
      3. For future dates, clearly state that you're providing a forecast.
      4. For questions about rain:
        - Probability 0%: No rain.
        - Probability 1-30%: Unlikely to rain.
        - Probability 31-70%: Might rain.
        - Probability 71-99%: Probably going to rain.
        - Probability 100%: Definitely going to rain.
      5. Use natural terms:
        - Instead of "wind speed 1.4 km/h", say "light wind" or "little wind".
        - Instead of "humidity 75%", say "moderate humidity" or "humid air".
        - Instead of "cloud cover 69%", say "partly cloudy" or "some clouds".
      6. Be concise and direct.
      7. Maintain a neutral, informative tone.
      8. If the question is about rain, start the response with rain info.
      9. If the question is ambiguous, explain your interpretation.
      10. For general weather questions, provide a brief summary.
      11. Always provide the specific temperature when available.
      12. For future dates, use phrases like "A previsão para [data] é..." or "According to the forecast for [date]..."

      Weather Data for ${name}${isFuture ? ` (Forecast for ${targetDate})` : ''}:
      - Temperature: ${temperature}°C
      - Condition: ${description}
      - Humidity: ${condition.humidity}%
      - Wind Speed: ${condition.windSpeed} km/h
      - Cloud Cover: ${condition.cloudCover}%
      - Precipitation Probability: ${condition.precipitationProbability}%
      - Precipitation Intensity: ${precipitationIntensity || 0} mm/h
      - UV Index: ${condition.uvIndex}
      - Time of Day: ${timeOfDay}
      ${isFuture ? `- Target Date: ${targetDate}` : ''}
      ${isFuture ? `- Target Time: ${targetTime}` : ''}
      ${explanation ? `- Query Interpretation: ${explanation}` : ''}
      Present the relevant data naturally based on the user's query.`
  };

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history.flatMap((chat): OpenAI.Chat.ChatCompletionMessageParam[] => [
    { role: 'user', content: chat.message },
    { role: 'assistant', content: chat.message }
  ]);

  const newUserMessage: OpenAI.Chat.ChatCompletionUserMessageParam = {
    role: 'user',
    content: query
  };

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    systemMessage,
    ...historyMessages,
    newUserMessage,
  ];

  return messages;
}

export async function detectLanguage(query: string): Promise<string> {
  const prompt = `Detect the language of the following query and return ONLY the language code (e.g., 'pt', 'en', 'es', 'fr'): "${query}"`;
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];
  const response = await createOpenAIResponse(messages);
  return response.choices[0].message.content?.trim().toLowerCase() || 'en';
}

export async function generateChatTitle(query: string): Promise<string> {
  const titlePrompt = `
    Generate a short, descriptive title (maximum 50 characters) for a weather chat session based on this user query: "${query}"
    
    The title should be concise and capture the essence of what the user is asking about.
    Return ONLY the title, with no additional text or explanation.
  `;

  try {
    const titleResponse = await createOpenAIResponse([{ role: 'user', content: titlePrompt }]);
    return titleResponse.choices[0].message.content?.trim() || 'Weather Query';
  } catch (error) {
    console.error('Error generating chat title:', error);
    // Fallback to a generic title if AI generation fails
    return 'Weather Query';
  }
}

export async function analyzeWeatherData(
  params: PromptParams,
  chatService: ChatService,
  userId: string
): Promise<WeatherAnalysis> {
  const chatTitle = await generateChatTitle(params.query);
  const session = await chatService.findOrCreateActiveSession(userId, chatTitle);
  const sessionData = await chatService.findSessionById(session.id);

  if (!sessionData) {
    throw new Error('Session not found');
  }

  const history = sessionData.chats;
  const language = await detectLanguage(params.query);
  const messages = await buildMessagesWithHistory(params, history, language);

  const response = await createOpenAIResponse(messages);
  const content = response.choices[0].message?.content;
  const naturalResponse = content ? String(content).replace(/^\s+|\s+$/g, '') : '';

  return {
    naturalResponse,
    sessionId: session.id
  };
}

/**
 * Analyzes the date mentioned in a query, considering chat history for context
 */
export async function analyzeDateWithHistory(query: string, history: Chat[]): Promise<string> {
  // Format chat history for context
  const historyContext = history.map(chat => {
    return `User: ${chat.message}\nAssistant: ${chat.message}`;
  }).join('\n\n');

  const dateAnalysisPrompt = `
    Analyze the following weather query and chat history to determine the date the user is asking about.
    
    Current query: "${query}"
    
    Chat history:
    ${historyContext}
    
    Determine if this query is about a specific future date or day of the week.
    If the query is ambiguous (like "today", "tomorrow", "this day", etc.), use the chat history to determine the context.
    If it is, extract the target date in YYYY-MM-DD format.
    If not, return "current".
    
    Return ONLY the date in YYYY-MM-DD format or "current" if it's about current weather.
    Do not include any explanation or additional text.
  `;

  try {
    const dateAnalysisResponse = await createOpenAIResponse([{ role: 'user', content: dateAnalysisPrompt }]);
    const content = dateAnalysisResponse.choices[0].message?.content;
    return content ? String(content).replace(/^\s+|\s+$/g, '') : 'current';
  } catch (error) {
    console.error('Error analyzing date with history:', error);
    return 'current';
  }
}
