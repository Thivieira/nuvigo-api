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
  source: 'context' | 'saved' | 'default';
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

  // Define language-specific prompts
  const prompts = {
    pt: `
      Você é um assistente meteorológico amigável e prestativo. Analise os dados meteorológicos abaixo e forneça uma resposta natural e informativa em português.
      
      Localização: ${params.name}
      Temperatura: ${params.temperature}°C
      Condição: ${params.description}
      Umidade: ${params.condition.humidity}%
      Velocidade do Vento: ${params.condition.windSpeed} km/h
      Cobertura de Nuvens: ${params.condition.cloudCover}%
      Probabilidade de Precipitação: ${params.condition.precipitationProbability}%
      Índice UV: ${params.condition.uvIndex}
      
      Período do Dia: ${params.timeOfDay}
      Data: ${params.targetDate}
      Horário: ${params.targetTime}
      
      Consulta do Usuário: "${params.query}"
      
      Forneça uma resposta natural e informativa em português, considerando:
      1. Se é uma previsão futura ou atual (use "será" para futuro, "está" para presente)
      2. O período exato do dia (madrugada, manhã, tarde, noite)
      3. A temperatura e como ela será/será sentida naquele período
      4. Condições meteorológicas apropriadas para o período
      5. Informações relevantes sobre umidade, vento e precipitação
      6. Recomendações úteis baseadas nas condições e período do dia
      
      IMPORTANTE:
      - Se for noite/madrugada, não mencione sol ou condições ensolaradas
      - Use descrições apropriadas para o período (ex: "céu estrelado" à noite, "céu limpo" durante o dia)
      - Considere a sensação térmica para o período específico
      - Forneça recomendações relevantes para o período
      - Se for uma previsão futura, use o tempo futuro ("será", "estará", "haverá")
      - Se for uma previsão atual, use o tempo presente ("está", "há")
      
      Mantenha o tom amigável e profissional.
    `,
    en: `
      You are a friendly and helpful weather assistant. Analyze the weather data below and provide a natural and informative response in English.
      
      Location: ${params.name}
      Temperature: ${params.temperature}°C
      Condition: ${params.description}
      Humidity: ${params.condition.humidity}%
      Wind Speed: ${params.condition.windSpeed} km/h
      Cloud Cover: ${params.condition.cloudCover}%
      Precipitation Probability: ${params.condition.precipitationProbability}%
      UV Index: ${params.condition.uvIndex}
      
      Time of Day: ${params.timeOfDay}
      Date: ${params.targetDate}
      Time: ${params.targetTime}
      
      User Query: "${params.query}"
      
      Provide a natural and informative response in English, considering:
      1. The exact time of day (early morning, morning, afternoon, evening, night)
      2. The current temperature and how it feels during that time
      3. Weather conditions appropriate for the time (e.g., don't mention sun during night)
      4. Relevant information about humidity, wind, and precipitation
      5. Useful recommendations based on conditions and time of day
      
      IMPORTANT:
      - If it's night/early morning, don't mention sun or sunny conditions
      - Use appropriate descriptions for the time (e.g., "starry sky" at night, "clear sky" during day)
      - Consider the temperature feel for the specific time
      - Provide relevant recommendations for the time (e.g., light jacket at night, sunscreen during day)
      
      Keep the tone friendly and professional.
    `,
    es: `
      Eres un asistente meteorológico amable y útil. Analiza los datos meteorológicos a continuación y proporciona una respuesta natural e informativa en español.
      
      Ubicación: ${params.name}
      Temperatura: ${params.temperature}°C
      Condición: ${params.description}
      Humedad: ${params.condition.humidity}%
      Velocidad del viento: ${params.condition.windSpeed} km/h
      Cobertura de nubes: ${params.condition.cloudCover}%
      Probabilidad de precipitación: ${params.condition.precipitationProbability}%
      Índice UV: ${params.condition.uvIndex}
      
      Hora del día: ${params.timeOfDay}
      Fecha: ${params.targetDate}
      Hora: ${params.targetTime}
      
      Consulta del usuario: "${params.query}"
      
      Proporciona una respuesta natural e informativa en español, considerando:
      1. La hora exacta del día (madrugada, mañana, tarde, noche)
      2. La temperatura actual y cómo se siente en ese momento
      3. Las condiciones climáticas apropiadas para el momento (ej: no mencionar sol durante la noche)
      4. Información relevante sobre humedad, viento y precipitación
      5. Recomendaciones útiles basadas en las condiciones y la hora
      
      IMPORTANTE:
      - Si es de noche/madrugada, no menciones sol o condiciones soleadas
      - Usa descripciones apropiadas para el momento (ej: "cielo estrellado" de noche, "cielo despejado" de día)
      - Considera la sensación térmica para el momento específico
      - Proporciona recomendaciones relevantes para la hora (ej: abrigo ligero de noche, protector solar de día)
      
      Mantén un tono amable y profesional.
    `
  };

  // Select the appropriate prompt based on detected language
  const prompt = prompts[language as keyof typeof prompts] || prompts.en;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system', content: language === 'pt' ? 'Você é um assistente meteorológico amigável e útil.' :
        language === 'es' ? 'Eres un asistente meteorológico amable y útil.' :
          'You are a friendly and helpful weather assistant.'
    },
    { role: 'user', content: prompt }
  ];

  const response = await createOpenAIResponse(messages);
  const naturalResponse = response.choices[0].message?.content ||
    (language === 'pt' ? 'Desculpe, não consegui gerar uma resposta adequada.' :
      language === 'es' ? 'Lo siento, no pude generar una respuesta adecuada.' :
        'Sorry, I could not generate an appropriate response.');

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
  defaultLocation: string = 'São Paulo'
): Promise<LocationAnalysis> {
  try {
    // 1. Try to extract location from the text
    const extractedLocation = await extractLocationFromText(text);

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

    // 2. Try to get user's active location
    const userLocations = await LocationService.getUserLocations(userId);
    const activeLocation = userLocations.find(loc => loc.isActive);

    if (activeLocation) {
      return {
        location: activeLocation.name,
        confidence: 0.8,
        source: 'saved'
      };
    }

    // 3. Fall back to default location
    return {
      location: defaultLocation,
      confidence: 0.5,
      source: 'default'
    };
  } catch (error) {
    console.error('Error analyzing location:', error);
    return {
      location: defaultLocation,
      confidence: 0.3,
      source: 'default'
    };
  }
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
