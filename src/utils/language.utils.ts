import dayjs from 'dayjs';
import { Chat, ChatSession } from '@prisma/generated/client';
import { createOpenAIResponse } from './openAI.utils';
import { ChatService } from '@/services/chat.service';
import { OpenAI } from 'openai';
import { Location as PrismaLocation } from '@prisma/generated/client';
import { LocationService } from '@/services/location.service';

type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

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
  queryTime: string;
  precipitationIntensity: number;
  query: string;
  dateAnalysis?: string;
  correctedTemperature?: number;
  temperatureValidation?: {
    min: number;
    max: number;
    season: string;
  };
}

export interface WeatherAnalysis {
  naturalResponse: string;
  analyzedTemperature?: number;
  sessionId: string;
  dateAnalysis?: string;
}

interface LocationAnalysis {
  location: string;
  confidence: number;
  source: 'context' | 'saved' | 'default' | 'history';
}

async function buildMessagesWithHistory(
  params: PromptParams,
  chatService: ChatService,
  userId: string
): Promise<ChatCompletionMessageParam[]> {
  try {
    const chatTitle = await generateChatTitle(params.query);
    const session = await chatService.findOrCreateActiveSession(userId, chatTitle);
    const sessionData = await chatService.findSessionById(session.id);

    if (!sessionData) {
      throw new Error('Session not found');
    }

    const history = sessionData.chats;
    const language = await detectLanguage(params.query);

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a weather assistant. Provide natural language responses about weather conditions. Current language: ${language}`
      },
      ...history.map(chat => ({
        role: chat.role as 'user' | 'assistant',
        content: chat.message
      })),
      {
        role: 'user',
        content: params.query
      }
    ];

    return messages;
  } catch (error) {
    console.error('Error building messages with history:', error);
    throw error;
  }
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

export const analyzeWeatherData = async (
  params: PromptParams,
  chatService: ChatService,
  userId: string
): Promise<{ naturalResponse: string; sessionId: string }> => {
  // Detect language from the query
  const language = await detectLanguage(params.query);

  const prompt = `
    You are Nuvigo, a friendly and professional weather assistant. Your task is to analyze the weather data below and generate a clear, localized, and informative response based on the user's query. Always respond in the same language the user used.

    ---

    Weather Data:
    - Location: ${params.name}
    - Temperature: ${params.temperature}°C
    - Condition: ${params.description}
    - Humidity: ${params.condition.humidity}%
    - Wind Speed: ${params.condition.windSpeed} km/h
    - Cloud Cover: ${params.condition.cloudCover}%
    - Precipitation Probability: ${params.condition.precipitationProbability}%
    - UV Index: ${params.condition.uvIndex}

    Time Context:
    - Date: ${params.targetDate}
    - Time: ${params.targetTime}
    - Time of Day: ${params.timeOfDay}

    User Query:
    "${params.query}"

    ---

    Generate a concise, friendly, and professional response that:

    1. Reflects the **exact time of day** using natural expressions (e.g., "manhã fria", "tarde amena", "noite fresca")
    2. Mentions the **observed temperature** and how it **feels** based on the time (e.g., cold, mild, warm)
    3. Describes the **weather conditions** in a natural and realistic way (e.g., avoid "sunny" during night)
    4. Includes relevant details about **humidity, wind, and chance of rain** when meaningful
    5. Provides **practical and culturally relevant suggestions** (e.g., "leve um casaco leve" for Brazilians in a chilly morning)
    6. Uses the **same language as the user query** (e.g., reply in Portuguese if the question is in Portuguese)

    Important:
    - Keep the tone **warm, natural, and authoritative**
    - Be **language-agnostic**: understand and respond in the user's language
    - Keep the output under **100 words**, unless the user asks for more detail
    - Avoid mentions of sun or brightness at **night or early morning**
    - Include **recommendations** relevant to the time and conditions (e.g., jacket, umbrella, sunscreen, hydration)

    Expected style (if user speaks Portuguese):
    > "Bom dia! Agora em Nova Iorque faz 4°C com céu parcialmente nublado. A umidade está em 75%, o que pode deixar o ar um pouco úmido. Há 20% de chance de chuva, então um casaco leve pode ser uma boa ideia. O vento está moderado a 12 km/h. Uma manhã fria, ideal pra se agasalhar bem!"
  `;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'You are Nuvigo, a friendly and professional weather assistant.'
    },
    { role: 'user', content: prompt }
  ];

  const response = await createOpenAIResponse(messages);
  const naturalResponse = response.choices[0].message?.content || 'Sorry, I could not generate an appropriate response.';

  // Create or update chat session
  const session = await chatService.findOrCreateActiveSession(userId);

  return {
    naturalResponse,
    sessionId: session.id
  };
};

/**
 * Analyzes the date mentioned in a query, considering chat history for context
 */
export async function analyzeDateWithHistory(query: string, history: Chat[]): Promise<string> {
  // Format chat history for context
  const historyContext = history.map(chat => {
    return `User: ${chat.message}\nAssistant: ${chat.message}`;
  }).join('\n\n');

  const dateAnalysisPrompt = `
    Analyze the following weather query and chat history to determine the date and time the user is asking about.
    
    Current query: "${query}"
    
    Chat history:
    ${historyContext}
    
    Determine:
    1. If this query is about a specific future date or day of the week
    2. The specific time of day if mentioned (morning, afternoon, evening, night)
    3. If the time is implied by the chat history
    
    Return the date and time in one of these formats:
    - For current weather: "current"
    - For future date: "YYYY-MM-DD"
    - For future date with time: "YYYY-MM-DD HH:mm"
    - For relative time (today, tomorrow): "current" or "YYYY-MM-DD"
    
    Return ONLY the date/time string. Do not include any explanation or additional text.
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

/**
 * Analyzes the context to determine the most appropriate location
 */
export async function analyzeLocation(
  text: string,
  userId: string,
  chatHistory?: Chat[]
): Promise<LocationAnalysis> {
  try {
    // 1. Try to extract location from the text
    const extractedLocation = await extractLocationFromText(text);

    // 2. Check chat history for location context
    if (chatHistory && chatHistory.length > 0) {
      const lastLocationMention = await findLastLocationMention(chatHistory);
      if (lastLocationMention) {
        console.log('Found location in chat history:', lastLocationMention);
        // If the current query is about correcting or changing location, use the new location
        if (isLocationCorrectionQuery(text)) {
          if (extractedLocation) {
            return {
              location: extractedLocation,
              confidence: 0.9,
              source: 'context'
            };
          }
        } else {
          // Otherwise, use the last mentioned location
          return {
            location: lastLocationMention,
            confidence: 0.8,
            source: 'history'
          };
        }
      }
    }

    if (extractedLocation) {
      // Validate if the extracted location exists in user's saved locations
      const userLocations = await LocationService.getUserLocations(userId);
      const matchingLocation = userLocations.find(loc =>
        loc.name.toLowerCase() === extractedLocation.toLowerCase()
      );

      if (matchingLocation) {
        return {
          location: matchingLocation.name,
          confidence: 0.9,
          source: 'saved'
        };
      }

      // If not found in saved locations, return the extracted location
      return {
        location: extractedLocation,
        confidence: 0.7,
        source: 'context'
      };
    }

    // 3. Try to get user's active location
    const userLocations = await LocationService.getUserLocations(userId);
    const activeLocation = userLocations.find(loc => loc.isActive);

    if (activeLocation) {
      return {
        location: activeLocation.name,
        confidence: 0.8,
        source: 'saved'
      };
    }

    // 4. If no location could be found, throw an error
    throw new Error('LOCATION_REQUIRED');
  } catch (error) {
    if (error instanceof Error && error.message === 'LOCATION_REQUIRED') {
      throw error; // Re-throw the location required error
    }
    console.error('Error analyzing location:', error);
    throw new Error('LOCATION_REQUIRED');
  }
}

async function findLastLocationMention(history: Chat[]): Promise<string | null> {
  try {
    // Reverse the history to check from most recent to oldest
    for (let i = history.length - 1; i >= 0; i--) {
      const chat = history[i];
      const location = await extractLocationFromText(chat.message);
      if (location) {
        return location;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding last location mention:', error);
    return null;
  }
}

function isLocationCorrectionQuery(text: string): boolean {
  const correctionKeywords = [
    'corrigir',
    'correction',
    'change',
    'mudar',
    'alterar',
    'actually',
    'na verdade',
    'correction',
    'correção',
    'wrong',
    'errado',
    'incorrect',
    'incorreto'
  ];

  return correctionKeywords.some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Extracts location from text using OpenAI
 */
async function extractLocationFromText(text: string): Promise<string | null> {
  try {
    const prompt = `Extract the location name from the following text. If no location is mentioned, return null. Text: "${text}"`;
    const response = await createOpenAIResponse([{ role: 'user', content: prompt }]);
    const location = response.choices[0].message?.content?.trim();
    return location && location !== 'null' ? location : null;
  } catch (error) {
    console.error('Error extracting location from text:', error);
    return null;
  }
}
