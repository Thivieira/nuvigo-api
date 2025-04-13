import dayjs from '@/lib/dayjs';
import { analyzeWeatherData, PromptParams, analyzeDateWithHistory, analyzeLocation } from '@/utils/language.utils';
import { getWeatherDescription, formatWeatherDataForResponse } from '@/utils/weather.utils';
import { env } from '@/env';
import { ChatService } from "@/services/chat.service";
import axios from 'axios';
import { TimelineRequest } from '@/types/weather';
import { Chat } from '@prisma/generated/client';
import { createOpenAIResponse } from '@/utils/openAI.utils';
import { ChatCreate } from '@/types/chat';
import { OpenAI } from 'openai';

interface WeatherResponse {
  location: string;
  temperature: string;
  condition: string;
  high: string;
  low: string;
  precipitation: string;
  humidity: string;
  windSpeed: string;
  weatherCode: number;
  naturalResponse?: string;
  currentTime?: string;
  queryTime?: string;
}

interface Location {
  type?: 'Point';
  coordinates?: [number, number];
  name?: string;
}

const DEFAULT_FIELDS = [
  'temperature',
  'humidity',
  'windSpeed',
  'cloudCover',
  'precipitationProbability',
  'uvIndex',
  'visibility',
  'pressureSeaLevel',
  'precipitationIntensity',
  'precipitationType',
  'cloudBase',
  'cloudCeiling',
  'windDirection',
  'windGust',
  'temperatureApparent',
  'weatherCode',
  'dewPoint',
  'freezingRainIntensity',
  'sleetIntensity',
  'snowIntensity',
  'uvHealthConcern',
  'pressureSurfaceLevel'
];

// Cache interface
interface WeatherCache {
  data: WeatherResponse;
  timestamp: number;
}

// Cache storage
const weatherCache = new Map<string, WeatherCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper functions
function formatLocationParam(location: string | { type?: 'Point'; coordinates?: [number, number]; name?: string }): string {
  if (typeof location === 'string') {
    const detectIfLocationIsGeo = location.includes(',');
    if (detectIfLocationIsGeo) {
      const coordinates = location.split(',').map(coord => {
        const num = parseFloat(coord.trim());
        return num.toFixed(4);
      });
      return coordinates.join(', ');
    }
    return location; // Return as is if it's a city name
  } else if (location && location.type === 'Point' && location.coordinates) {
    // Handle Location object (geo coordinates)
    return location.coordinates.map(coord => coord.toFixed(4)).join(', ');
  } else if (location && location.name) {
    // Handle Location object (name)
    return location.name;
  }
  throw new Error('Invalid location format');
}

// Define a type for the combined response
interface FlexibleWeatherResult {
  weatherData: WeatherResponse | null;
  sessionId: string;
  naturalResponse: string;
  requiresLocation?: boolean;
}

export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.tomorrow.io/v4/weather';
  private readonly rateLimits = {
    daily: 500,
    hourly: 25,
    perSecond: 3
  };

  constructor() {
    this.apiKey = env.TOMORROW_API_KEY;
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = INITIAL_RETRY_DELAY
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries === 0) throw error;

      // Only retry on rate limit errors
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || delay;
        console.log(`Rate limit hit, retrying in ${retryAfter}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        return this.retryWithBackoff(operation, retries - 1, delay * 2);
      }

      throw error;
    }
  }

  private checkRateLimits(headers: any) {
    // Helper function to safely parse header values
    const parseHeader = (value: string | undefined, defaultValue: number): number => {
      if (!value) return defaultValue;
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Get the web app rate limit and normalize it to our expected range
    const webAppLimit = parseHeader(headers['x-ratelimit-remaining-web-app'], this.rateLimits.daily);
    // Normalize the web app limit (500000) to our expected range (500)
    const normalizedWebAppLimit = Math.min(Math.round(webAppLimit / 1000), this.rateLimits.daily);

    // Get unique plan limits (deduplicate by plan ID)
    const planLimitsMap = new Map<string, number>();
    Object.entries(headers)
      .filter(([key]) => key.startsWith('x-ratelimit-remaining-plan-'))
      .forEach(([key, value]) => {
        const planId = key.split('-').pop();
        if (planId) {
          const limit = parseHeader(value as string, this.rateLimits.hourly);
          if (!planLimitsMap.has(planId) || limit < (planLimitsMap.get(planId) || 0)) {
            planLimitsMap.set(planId, limit);
          }
        }
      });

    const planLimits = Array.from(planLimitsMap.values());
    const minPlanLimit = planLimits.length > 0 ? Math.min(...planLimits) : this.rateLimits.hourly;

    const limits = {
      daily: {
        limit: this.rateLimits.daily,
        remaining: normalizedWebAppLimit
      },
      hourly: {
        limit: this.rateLimits.hourly,
        remaining: minPlanLimit
      },
      perSecond: {
        limit: this.rateLimits.perSecond,
        remaining: this.rateLimits.perSecond // We'll use the default for per-second limits
      }
    };

    // Log rate limit status with percentage remaining
    const status = {
      daily: {
        remaining: limits.daily.remaining,
        limit: limits.daily.limit,
        percentage: Math.round((limits.daily.remaining / limits.daily.limit) * 100)
      },
      hourly: {
        remaining: limits.hourly.remaining,
        limit: limits.hourly.limit,
        percentage: Math.round((limits.hourly.remaining / limits.hourly.limit) * 100)
      },
      perSecond: {
        remaining: limits.perSecond.remaining,
        limit: limits.perSecond.limit,
        percentage: Math.round((limits.perSecond.remaining / limits.perSecond.limit) * 100)
      }
    };

    console.log('Rate Limits Status:', JSON.stringify(status, null, 2));

    // Group plans by their remaining limits
    const groupedPlans = Array.from(planLimitsMap.entries()).reduce((acc, [planId, limit]) => {
      if (!acc[limit]) {
        acc[limit] = [];
      }
      acc[limit].push(planId);
      return acc;
    }, {} as Record<number, string[]>);

    // Sort groups by limit (ascending)
    const sortedGroups = Object.entries(groupedPlans)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 3); // Show only the 3 most restrictive groups

    // Log grouped plan limits
    if (sortedGroups.length > 0) {
      console.debug('Plan Limits by Group:', sortedGroups.map(([limit, planIds]) => ({
        remaining: parseInt(limit),
        percentage: Math.round((parseInt(limit) / this.rateLimits.hourly) * 100),
        planCount: planIds.length,
        plans: planIds.map(id => `x-ratelimit-remaining-plan-${id}`)
      })));
    }

    // Check if we're close to any limits and provide actionable warnings
    const warnings = [];
    if (limits.daily.remaining < 100) {
      warnings.push(`Daily limit is running low (${limits.daily.remaining}/${limits.daily.limit}) - Consider reducing API calls`);
    }
    if (limits.hourly.remaining < 5) {
      const criticalPlans = sortedGroups.filter(([limit]) => parseInt(limit) < 5);
      const planCount = criticalPlans.reduce((sum, [_, ids]) => sum + ids.length, 0);
      warnings.push(`Hourly limit is running low (${limits.hourly.remaining}/${limits.hourly.limit}) - ${planCount} plan(s) affected`);
    }
    if (limits.perSecond.remaining < 1) {
      warnings.push(`Per-second limit is running low (${limits.perSecond.remaining}/${limits.perSecond.limit}) - Consider implementing request queuing`);
    }

    if (warnings.length > 0) {
      console.warn('Rate Limit Warnings:', warnings);
    }

    // Log summary of all plans
    const planSummary = {
      totalPlans: planLimitsMap.size,
      minLimit: Math.min(...planLimits),
      maxLimit: Math.max(...planLimits),
      averageLimit: Math.round(planLimits.reduce((a, b) => a + b, 0) / planLimits.length),
      criticalPlans: Object.entries(groupedPlans)
        .filter(([limit]) => parseInt(limit) < 5)
        .reduce((sum, [_, ids]) => sum + ids.length, 0)
    };
    console.debug('Plan Limits Summary:', planSummary);
  }

  private checkTokenUsage(headers: any) {
    const tokenCost = headers['x-tokens-cost-weather'];
    const tokensRemaining = headers['x-tokens-remaining-weather'];

    if (tokenCost && tokensRemaining) {
      console.log('Token Usage:', {
        cost: tokenCost,
        remaining: tokensRemaining
      });

      if (parseInt(tokensRemaining) < 100) {
        console.warn('Low token balance:', tokensRemaining);
      }
    }
  }

  private getCacheKey(location: string | { lat: number; lon: number }): string {
    return typeof location === 'string' ? location : `${location.lat},${location.lon}`;
  }

  private getFromCache(location: string | { lat: number; lon: number }): WeatherResponse | null {
    const cacheKey = this.getCacheKey(location);
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached weather data for:', cacheKey);
      return cached.data;
    }

    return null;
  }

  private setCache(location: string | { lat: number; lon: number }, data: WeatherResponse): void {
    const cacheKey = this.getCacheKey(location);
    weatherCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  async getWeather(location: string | { lat: number; lon: number }): Promise<WeatherResponse> {
    try {
      // Check cache first
      const cachedData = this.getFromCache(location);
      if (cachedData) {
        console.log('Using cached weather data for:', location);
        return cachedData;
      }

      const locationParam = typeof location === 'string'
        ? `location=${encodeURIComponent(location)}`
        : `location=${location.lat},${location.lon}`;

      console.log('Making realtime API request to Tomorrow.io with params:', {
        location: locationParam,
        endpoint: `${this.baseUrl}/realtime`,
        units: 'metric'
      });

      // Get realtime weather data with retry logic
      const response = await this.retryWithBackoff(async () => {
        const url = `${this.baseUrl}/realtime?${locationParam}&apikey=${this.apiKey}&units=metric`;
        console.log('Full realtime API URL:', url);

        const result = await axios.get(url);
        console.log('Raw realtime API response:', result.data);

        // Check rate limits and token usage
        this.checkRateLimits(result.headers);
        this.checkTokenUsage(result.headers);

        return result;
      });

      if (!response.data || !response.data.data) {
        console.error('Invalid realtime API response structure:', response.data);
        throw new Error('Invalid response from weather API');
      }

      const data = response.data.data;
      console.log('Processed realtime weather data:', {
        temperature: data.values.temperature,
        apparentTemperature: data.values.temperatureApparent,
        humidity: data.values.humidity,
        windSpeed: data.values.windSpeed,
        cloudCover: data.values.cloudCover,
        precipitationProbability: data.values.precipitationProbability,
        weatherCode: data.values.weatherCode,
        time: data.time
      });

      // Format precipitation based on type and intensity
      let precipitation = '0%';
      const precipProbability = Math.round(data.values.precipitationProbability);
      const rainIntensity = data.values.rainIntensity || 0;
      const snowIntensity = data.values.snowIntensity || 0;
      const freezingRainIntensity = data.values.freezingRainIntensity || 0;
      const sleetIntensity = data.values.sleetIntensity || 0;

      if (precipProbability > 0) {
        if (rainIntensity > 0) {
          precipitation = `${precipProbability}% rain (${rainIntensity.toFixed(1)} mm/h)`;
        } else if (snowIntensity > 0) {
          precipitation = `${precipProbability}% snow (${snowIntensity.toFixed(1)} mm/h)`;
        } else if (freezingRainIntensity > 0) {
          precipitation = `${precipProbability}% freezing rain (${freezingRainIntensity.toFixed(1)} mm/h)`;
        } else if (sleetIntensity > 0) {
          precipitation = `${precipProbability}% sleet (${sleetIntensity.toFixed(1)} mm/h)`;
        } else {
          precipitation = `${precipProbability}%`;
        }
      }

      const weatherResponse: WeatherResponse = {
        location: typeof location === 'string' ? location : `${location.lat},${location.lon}`,
        temperature: Math.round(data.values.temperature).toString(),
        condition: this.translateCondition(data.values.weatherCode, 'day'),
        high: Math.round(data.values.temperature).toString(),
        low: Math.round(data.values.temperature).toString(),
        precipitation,
        humidity: `${Math.round(data.values.humidity)}%`,
        windSpeed: `${Math.round(data.values.windSpeed)} km/h`,
        weatherCode: data.values.weatherCode
      };

      // Cache the response
      this.setCache(location, weatherResponse);

      console.log('Final realtime weather response:', weatherResponse);
      return weatherResponse;
    } catch (error) {
      console.error('Realtime Weather API Error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Realtime API Error Response:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
          throw new Error(`Weather API error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
          console.error('No response received from realtime API:', error.request);
          throw new Error('No response received from weather API');
        }
      }
      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private translateCondition(code: number, timeOfDay: string = 'day', language: string = 'en'): string {
    // Define language-specific condition translations
    const conditions: Record<string, Record<number, string>> = {
      en: {
        1000: timeOfDay === 'night' ? 'Clear Sky' : 'Clear Sky',
        1100: timeOfDay === 'night' ? 'Partly Cloudy' : 'Partly Cloudy',
        1101: timeOfDay === 'night' ? 'Partly Cloudy' : 'Partly Cloudy',
        1102: timeOfDay === 'night' ? 'Partly Cloudy' : 'Partly Cloudy',
        1001: timeOfDay === 'night' ? 'Cloudy' : 'Cloudy',
        2000: timeOfDay === 'night' ? 'Fog' : 'Fog',
        2100: timeOfDay === 'night' ? 'Light Fog' : 'Light Fog',
        4000: timeOfDay === 'night' ? 'Rain' : 'Rain',
        4001: timeOfDay === 'night' ? 'Rain' : 'Rain',
        4200: timeOfDay === 'night' ? 'Light Rain' : 'Light Rain',
        4201: timeOfDay === 'night' ? 'Heavy Rain' : 'Heavy Rain',
        5000: timeOfDay === 'night' ? 'Snow' : 'Snow',
        5001: timeOfDay === 'night' ? 'Snow' : 'Snow',
        5100: timeOfDay === 'night' ? 'Light Snow' : 'Light Snow',
        5101: timeOfDay === 'night' ? 'Heavy Snow' : 'Heavy Snow',
        6000: timeOfDay === 'night' ? 'Freezing Rain' : 'Freezing Rain',
        6001: timeOfDay === 'night' ? 'Freezing Rain' : 'Freezing Rain',
        6200: timeOfDay === 'night' ? 'Light Freezing Rain' : 'Light Freezing Rain',
        6201: timeOfDay === 'night' ? 'Heavy Freezing Rain' : 'Heavy Freezing Rain',
        7000: timeOfDay === 'night' ? 'Hail' : 'Hail',
        7101: timeOfDay === 'night' ? 'Hail' : 'Hail',
        7102: timeOfDay === 'night' ? 'Heavy Hail' : 'Heavy Hail',
        8000: timeOfDay === 'night' ? 'Thunderstorm' : 'Thunderstorm',
      },
      pt: {
        1000: timeOfDay === 'night' ? 'Céu Limpo' : 'Céu Limpo',
        1100: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1101: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1102: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1001: timeOfDay === 'night' ? 'Nublado' : 'Nublado',
        2000: timeOfDay === 'night' ? 'Neblina' : 'Neblina',
        2100: timeOfDay === 'night' ? 'Neblina Leve' : 'Neblina Leve',
        4000: timeOfDay === 'night' ? 'Chuva' : 'Chuva',
        4001: timeOfDay === 'night' ? 'Chuva' : 'Chuva',
        4200: timeOfDay === 'night' ? 'Chuva Leve' : 'Chuva Leve',
        4201: timeOfDay === 'night' ? 'Chuva Forte' : 'Chuva Forte',
        5000: timeOfDay === 'night' ? 'Neve' : 'Neve',
        5001: timeOfDay === 'night' ? 'Neve' : 'Neve',
        5100: timeOfDay === 'night' ? 'Neve Leve' : 'Neve Leve',
        5101: timeOfDay === 'night' ? 'Neve Forte' : 'Neve Forte',
        6000: timeOfDay === 'night' ? 'Chuva Congelante' : 'Chuva Congelante',
        6001: timeOfDay === 'night' ? 'Chuva Congelante' : 'Chuva Congelante',
        6200: timeOfDay === 'night' ? 'Chuva Congelante Leve' : 'Chuva Congelante Leve',
        6201: timeOfDay === 'night' ? 'Chuva Congelante Forte' : 'Chuva Congelante Forte',
        7000: timeOfDay === 'night' ? 'Granizo' : 'Granizo',
        7101: timeOfDay === 'night' ? 'Granizo' : 'Granizo',
        7102: timeOfDay === 'night' ? 'Granizo Pesado' : 'Granizo Pesado',
        8000: timeOfDay === 'night' ? 'Tempestade' : 'Tempestade',
      },
      es: {
        1000: timeOfDay === 'night' ? 'Cielo Despejado' : 'Cielo Despejado',
        1100: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1101: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1102: timeOfDay === 'night' ? 'Parcialmente Nublado' : 'Parcialmente Nublado',
        1001: timeOfDay === 'night' ? 'Nublado' : 'Nublado',
        2000: timeOfDay === 'night' ? 'Niebla' : 'Niebla',
        2100: timeOfDay === 'night' ? 'Niebla Ligera' : 'Niebla Ligera',
        4000: timeOfDay === 'night' ? 'Lluvia' : 'Lluvia',
        4001: timeOfDay === 'night' ? 'Lluvia' : 'Lluvia',
        4200: timeOfDay === 'night' ? 'Lluvia Ligera' : 'Lluvia Ligera',
        4201: timeOfDay === 'night' ? 'Lluvia Intensa' : 'Lluvia Intensa',
        5000: timeOfDay === 'night' ? 'Nieve' : 'Nieve',
        5001: timeOfDay === 'night' ? 'Nieve' : 'Nieve',
        5100: timeOfDay === 'night' ? 'Nieve Ligera' : 'Nieve Ligera',
        5101: timeOfDay === 'night' ? 'Nieve Intensa' : 'Nieve Intensa',
        6000: timeOfDay === 'night' ? 'Lluvia Congelante' : 'Lluvia Congelante',
        6001: timeOfDay === 'night' ? 'Lluvia Congelante' : 'Lluvia Congelante',
        6200: timeOfDay === 'night' ? 'Lluvia Congelante Ligera' : 'Lluvia Congelante Ligera',
        6201: timeOfDay === 'night' ? 'Lluvia Congelante Intensa' : 'Lluvia Congelante Intensa',
        7000: timeOfDay === 'night' ? 'Granizo' : 'Granizo',
        7101: timeOfDay === 'night' ? 'Granizo' : 'Granizo',
        7102: timeOfDay === 'night' ? 'Granizo Intenso' : 'Granizo Intenso',
        8000: timeOfDay === 'night' ? 'Tormenta' : 'Tormenta',
      }
    };

    const languageConditions = conditions[language] || conditions.en;
    return languageConditions[code] || 'Unknown Condition';
  }

  async getFlexibleWeather(
    request: TimelineRequest,
    query: string,
    chatService: ChatService,
    userId: string
  ): Promise<FlexibleWeatherResult> {
    try {
      const queryTime = dayjs();
      console.log('Query time:', queryTime.format('YYYY-MM-DD HH:mm:ss'));

      // Get the chat session and history first
      const initialSession = await chatService.findOrCreateActiveSession(userId);
      const initialSessionId = initialSession.id;
      const sessionData = await chatService.findSessionById(initialSessionId);
      const history = sessionData?.chats ?? [];

      // If no location is provided in the request, try to extract it from the query with history context
      let location: string | { type?: 'Point'; coordinates?: [number, number]; name?: string } = request.location;
      if (!location) {
        try {
          const locationAnalysis = await analyzeLocation(query, userId, history);
          location = locationAnalysis.location;
          console.log('Extracted location from query with history context:', location);
        } catch (error) {
          if (error instanceof Error && error.message === 'LOCATION_REQUIRED') {
            // Create a chat message asking for location
            const prompt = `I need to know which location you're asking about. Could you please specify a city or location?`;
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
              {
                role: 'system',
                content: 'You are a weather assistant. Ask the user to specify a location.'
              },
              { role: 'user', content: prompt }
            ];

            const response = await createOpenAIResponse(messages);
            const naturalResponse = response.choices[0].message?.content || 'Could you please specify a location?';

            // Save the chat message
            const chatData: ChatCreate = {
              chatSessionId: initialSessionId,
              message: naturalResponse,
              role: 'assistant',
              turn: history.length + 1
            };

            await chatService.create(userId, chatData);

            return {
              weatherData: null,
              sessionId: initialSessionId,
              naturalResponse,
              requiresLocation: true
            };
          }
          throw error;
        }
      }

      const locationParam = formatLocationParam(location);
      console.log('Location parameter:', locationParam);

      // Analyze the date and time in the query using chat history
      const dateAnalysis = await analyzeDateWithHistory(query, history);
      console.log('Date analysis:', dateAnalysis);

      let isFuture = false;
      let targetDayjs = queryTime;
      let targetTime = 'current';

      if (dateAnalysis !== 'current' && dateAnalysis.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsedTargetDate = dayjs(dateAnalysis);
        const daysDifference = parsedTargetDate.diff(queryTime, 'day');

        if (daysDifference < 0) {
          console.log(`Target date ${dateAnalysis} is in the past, using current date instead`);
          isFuture = false;
        } else if (daysDifference > 5) {
          console.log(`Target date ${dateAnalysis} is too far in the future (${daysDifference} days), limiting to 5 days`);
          isFuture = true;
          targetDayjs = queryTime.add(5, 'day');
        } else {
          isFuture = true;
          targetDayjs = parsedTargetDate;
          console.log(`AI detected future date: ${dateAnalysis} (${daysDifference} days ahead)`);
        }
      }

      // Set the target time based on the analysis
      if (dateAnalysis !== 'current' && dateAnalysis.match(/^[0-9]{2}:[0-9]{2}$/)) {
        targetTime = dateAnalysis;
        // Adjust the targetDayjs to the appropriate time of day
        const [hour, minute] = dateAnalysis.split(':').map(Number);
        targetDayjs = targetDayjs.hour(hour).minute(minute);
      }

      const timelineRequest: TimelineRequest = {
        location: locationParam,
        fields: DEFAULT_FIELDS,
        timesteps: ['1h'],
        startTime: isFuture ? targetDayjs.format('YYYY-MM-DD') : 'now',
        units: 'metric',
        timezone: 'America/Sao_Paulo',
        endTime: isFuture ? targetDayjs.add(1, 'day').format('YYYY-MM-DD') : dayjs().add(5, 'days').format('YYYY-MM-DD')
      };

      console.log('Making timelines API request to Tomorrow.io with params:', timelineRequest);

      const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;
      console.log('Full timelines API URL:', weatherUrl);

      let weatherResponse;
      try {
        console.log('Starting timelines API call');
        weatherResponse = await axios.post(weatherUrl, timelineRequest, {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Timelines API call completed with status:', weatherResponse.status);
      } catch (error: any) {
        console.error('Error calling timelines API:', error);
        throw new Error(`Failed to fetch weather data: ${error.message}`);
      }

      if (weatherResponse.status !== 200) {
        console.error('Timelines API Error:', {
          status: weatherResponse.status,
          statusText: weatherResponse.statusText,
          error: weatherResponse.data
        });
        throw new Error(`Failed to fetch weather data: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }

      let weatherData = weatherResponse.data;
      console.log('Timelines weather data received successfully');

      if (!weatherData.data || !weatherData.data.timelines || weatherData.data.timelines.length === 0 || !weatherData.data.timelines[0].intervals || weatherData.data.timelines[0].intervals.length === 0) {
        console.error('Invalid or empty timeline data received from Tomorrow.io');
        throw new Error('Weather data not found for the specified location or time');
      }

      // Find the target interval for the requested date/time
      let targetInterval = weatherData.data.timelines[0].intervals[0];
      if (isFuture) {
        targetInterval = weatherData.data.timelines[0].intervals.find(interval =>
          dayjs(interval.startTime).format('YYYY-MM-DD') === targetDayjs.format('YYYY-MM-DD')
        ) || targetInterval;
        console.log('Target interval for future date:', targetInterval);
      }

      const targetValues = targetInterval.values;
      console.log('Target temperature:', targetValues.temperature);

      if (targetValues.temperature === undefined || targetValues.temperature === null) {
        console.warn('Temperature is undefined or null in the API response, using default value');
        targetValues.temperature = 0;
      }

      const weatherDescription = getWeatherDescription(targetValues.weatherCode || 1000);

      const hour = dayjs(targetInterval.startTime).hour();
      let timeOfDay = 'night';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
      else if (hour >= 22 || hour < 5) timeOfDay = 'night';

      // For more precise time descriptions
      let preciseTimeOfDay = timeOfDay;
      if (hour >= 0 && hour < 5) preciseTimeOfDay = 'madrugada';
      else if (hour >= 5 && hour < 12) preciseTimeOfDay = 'manhã';
      else if (hour >= 12 && hour < 18) preciseTimeOfDay = 'tarde';
      else if (hour >= 18 && hour < 22) preciseTimeOfDay = 'noite';
      else preciseTimeOfDay = 'madrugada';

      const formattedWeatherData = formatWeatherDataForResponse(targetValues);
      console.log('Formatted weather data:', formattedWeatherData);

      const condition = {
        cloudBase: targetValues.cloudBase,
        cloudCeiling: targetValues.cloudCeiling,
        cloudCover: targetValues.cloudCover,
        dewPoint: targetValues.dewPoint || 0,
        freezingRainIntensity: targetValues.freezingRainIntensity || 0,
        humidity: targetValues.humidity,
        precipitationProbability: targetValues.precipitationProbability,
        pressureSeaLevel: targetValues.pressureSeaLevel,
        pressureSurfaceLevel: targetValues.pressureSurfaceLevel || 0,
        rainIntensity: targetValues.rainIntensity || 0,
        sleetIntensity: targetValues.sleetIntensity || 0,
        snowIntensity: targetValues.snowIntensity || 0,
        temperature: targetValues.temperature,
        temperatureApparent: targetValues.temperatureApparent,
        uvIndex: targetValues.uvIndex,
        visibility: targetValues.visibility,
        weatherCode: targetValues.weatherCode,
        windDirection: targetValues.windDirection,
        windGust: targetValues.windGust,
        windSpeed: targetValues.windSpeed
      };

      const params: PromptParams = {
        name: locationParam,
        temperature: targetValues.temperature,
        description: weatherDescription,
        condition: {
          humidity: targetValues.humidity,
          windSpeed: targetValues.windSpeed,
          cloudCover: targetValues.cloudCover,
          precipitationProbability: targetValues.precipitationProbability,
          uvIndex: targetValues.uvIndex
        },
        timeOfDay,
        isFuture,
        targetDate: targetDayjs.format('YYYY-MM-DD'),
        targetTime: targetDayjs.format('HH:mm'),
        queryTime: queryTime.format('YYYY-MM-DD HH:mm:ss'),
        precipitationIntensity: targetValues.precipitationIntensity,
        query
      };

      const { naturalResponse, sessionId } = await analyzeWeatherData(params, chatService, userId);

      const finalWeatherData: WeatherResponse = {
        location: locationParam,
        temperature: Math.round(targetValues.temperature).toString(),
        condition: this.translateCondition(targetValues.weatherCode || 1000, timeOfDay),
        high: Math.round(targetValues.temperatureMax || targetValues.temperature).toString(),
        low: Math.round(targetValues.temperatureMin || targetValues.temperature).toString(),
        precipitation: `${Math.round(targetValues.precipitationProbability * 100)}%`,
        humidity: `${Math.round(targetValues.humidity)}%`,
        windSpeed: `${Math.round(targetValues.windSpeed)} km/h`,
        weatherCode: targetValues.weatherCode || 1000,
        naturalResponse,
        currentTime: dayjs(targetInterval.startTime).format('YYYY-MM-DD HH:mm:ss'),
        queryTime: queryTime.format('YYYY-MM-DD HH:mm:ss')
      };

      return {
        weatherData: finalWeatherData,
        sessionId,
        naturalResponse
      };
    } catch (error) {
      console.error('Error in getFlexibleWeather:', error);
      throw error;
    }
  }
}