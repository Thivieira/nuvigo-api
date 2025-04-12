import dayjs from '@/lib/dayjs';
import { analyzeWeatherData, PromptParams, analyzeDateWithHistory } from '@/utils/language.utils';
import { getWeatherDescription, formatWeatherDataForResponse } from '@/utils/weather.utils';
import { env } from '@/env';
import { ChatService } from "./chat.service";
import axios from 'axios';

interface TimelineRequest {
  location: string | {
    type: 'Point';
    coordinates: [number, number];
  };
  fields: string[];
  timesteps: string[];
  startTime: string;
  endTime: string;
  units?: string;
  timezone?: string;
}

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
function formatLocationParam(location: string | Location): string {
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
  weatherData: WeatherResponse;
  sessionId: string;
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
        return cachedData;
      }

      const locationParam = typeof location === 'string'
        ? `location=${encodeURIComponent(location)}`
        : `location=${location.lat},${location.lon}`;

      console.log('Fetching weather data for:', locationParam);

      // Get realtime weather data with retry logic
      const response = await this.retryWithBackoff(async () => {
        const result = await axios.get(
          `${this.baseUrl}/realtime?${locationParam}&apikey=${this.apiKey}&units=metric`
        );

        // Check rate limits and token usage
        this.checkRateLimits(result.headers);
        this.checkTokenUsage(result.headers);

        return result;
      });

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from weather API');
      }

      const data = response.data.data;
      console.log('Received weather data:', data);

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
        condition: this.translateCondition(data.values.weatherCode),
        high: Math.round(data.values.temperature).toString(),
        low: Math.round(data.values.temperature).toString(),
        precipitation,
        humidity: `${Math.round(data.values.humidity)}%`,
        windSpeed: `${Math.round(data.values.windSpeed)} km/h`,
        weatherCode: data.values.weatherCode
      };

      // Cache the response
      this.setCache(location, weatherResponse);

      console.log('Returning weather response:', weatherResponse);
      return weatherResponse;
    } catch (error) {
      console.error('Weather API Error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Weather API error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
          throw new Error('No response received from weather API');
        }
      }
      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private translateCondition(code: number): string {
    // Basic translation of weather codes to Portuguese
    const conditions: { [key: number]: string } = {
      1000: 'Céu Limpo',
      1100: 'Parcialmente Nublado',
      1101: 'Parcialmente Nublado',
      1102: 'Parcialmente Nublado',
      1001: 'Nublado',
      2000: 'Neblina',
      2100: 'Neblina Leve',
      4000: 'Chuva',
      4001: 'Chuva',
      4200: 'Chuva Leve',
      4201: 'Chuva Forte',
      5000: 'Neve',
      5001: 'Neve',
      5100: 'Neve Leve',
      5101: 'Neve Forte',
      6000: 'Chuva Congelante',
      6001: 'Chuva Congelante',
      6200: 'Chuva Congelante Leve',
      6201: 'Chuva Congelante Forte',
      7000: 'Granizo',
      7101: 'Granizo',
      7102: 'Granizo Pesado',
      8000: 'Tempestade',
    };

    return conditions[code] || 'Condição Desconhecida';
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

      const locationParam = formatLocationParam(request.location);
      console.log('Location parameter:', locationParam);

      // Get the chat session and history first
      const initialSession = await chatService.findOrCreateActiveSession(userId);
      const initialSessionId = initialSession.id;

      const sessionData = await chatService.findSessionById(initialSessionId);
      const history = sessionData?.chats ?? [];

      // Use the analyzeDateWithHistory function
      const dateAnalysisResponse = await analyzeDateWithHistory(query, history);
      console.log('Date analysis with history response:', dateAnalysisResponse);

      let isFuture = false;
      let targetDate = '';
      let targetTime = '';
      let targetDayjs = queryTime;

      const cleanDateResponse = dateAnalysisResponse.trim().toLowerCase();
      console.log('Cleaned date response:', cleanDateResponse);

      if (cleanDateResponse !== 'current' && cleanDateResponse.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsedTargetDate = dayjs(cleanDateResponse);
        const daysDifference = parsedTargetDate.diff(queryTime, 'day');

        if (daysDifference < 0) {
          console.log(`Target date ${cleanDateResponse} is in the past, using current date instead`);
          isFuture = false;
          targetDate = queryTime.format('YYYY-MM-DD');
          targetDayjs = queryTime;
          targetTime = queryTime.format('HH:mm');
        } else if (daysDifference > 5) {
          console.log(`Target date ${cleanDateResponse} is too far in the future (${daysDifference} days), limiting to 5 days`);
          isFuture = true;
          targetDayjs = queryTime.add(5, 'day');
          targetDate = targetDayjs.format('YYYY-MM-DD');
          targetDayjs = targetDayjs.tz('America/Sao_Paulo').hour(12).minute(0).second(0);
          targetTime = targetDayjs.format('HH:mm');
        } else {
          isFuture = true;
          targetDate = cleanDateResponse;
          targetDayjs = dayjs(targetDate).tz('America/Sao_Paulo').hour(12).minute(0).second(0);
          targetTime = targetDayjs.format('HH:mm');
          console.log(`AI detected future date: ${targetDate} (${daysDifference} days ahead)`);
        }
      } else {
        console.log('AI detected current date query');
      }

      const timelineRequest: TimelineRequest = {
        location: locationParam,
        fields: DEFAULT_FIELDS,
        timesteps: ['1h'],
        startTime: isFuture ? targetDate : 'now',
        units: 'metric',
        timezone: 'America/Sao_Paulo',
        endTime: isFuture ? dayjs(targetDate).add(1, 'day').toISOString() : dayjs().add(5, 'days').toISOString()
      };

      console.log('Timeline request:', timelineRequest);

      const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;
      console.log('Making request to Tomorrow.io API');

      let weatherResponse;
      try {
        console.log('Starting Tomorrow.io API call');
        weatherResponse = await axios.post(weatherUrl, timelineRequest, {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Tomorrow.io API call completed with status:', weatherResponse.status);
      } catch (error: any) {
        console.error('Error calling Tomorrow.io API:', error);
        throw new Error(`Failed to fetch weather data: ${error.message}`);
      }

      if (weatherResponse.status !== 200) {
        console.error('Tomorrow.io API Error:', {
          status: weatherResponse.status,
          statusText: weatherResponse.statusText,
          error: weatherResponse.data
        });
        throw new Error(`Failed to fetch weather data: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }

      let weatherData = weatherResponse.data;
      console.log('Weather data received successfully');

      console.log('Timeline data structure:', JSON.stringify(weatherData.data.timelines[0], null, 2));

      if (!weatherData.data || !weatherData.data.timelines || weatherData.data.timelines.length === 0 || !weatherData.data.timelines[0].intervals || weatherData.data.timelines[0].intervals.length === 0) {
        console.error('Invalid or empty timeline data received from Tomorrow.io');
        throw new Error('Weather data not found for the specified location or time');
      }

      const currentInterval = weatherData.data.timelines[0].intervals[0];
      const values = currentInterval.values;
      console.log('Raw temperature from API:', values.temperature);

      if (values.temperature === undefined || values.temperature === null) {
        console.error('Temperature is undefined or null in the API response');
        throw new Error('Invalid temperature data from API');
      }

      const weatherDescription = getWeatherDescription(values.weatherCode || 1000);

      const hour = dayjs(currentInterval.startTime).hour();
      let timeOfDay = 'night';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening';

      const formattedWeatherData = formatWeatherDataForResponse(values);
      console.log('Formatted weather data:', formattedWeatherData);

      const condition = {
        cloudBase: values.cloudBase,
        cloudCeiling: values.cloudCeiling,
        cloudCover: values.cloudCover,
        dewPoint: values.dewPoint || 0,
        freezingRainIntensity: values.freezingRainIntensity || 0,
        humidity: values.humidity,
        precipitationProbability: values.precipitationProbability,
        pressureSeaLevel: values.pressureSeaLevel,
        pressureSurfaceLevel: values.pressureSurfaceLevel || 0,
        rainIntensity: values.rainIntensity || 0,
        sleetIntensity: values.sleetIntensity || 0,
        snowIntensity: values.snowIntensity || 0,
        temperature: values.temperature,
        temperatureApparent: values.temperatureApparent,
        uvHealthConcern: values.uvHealthConcern || 0,
        uvIndex: values.uvIndex || 0,
        visibility: values.visibility,
        weatherCode: values.weatherCode || 1000,
        windDirection: values.windDirection,
        windGust: values.windGust,
        windSpeed: values.windSpeed
      };

      const promptParams: PromptParams = {
        name: locationParam,
        temperature: values.temperature,
        description: weatherDescription || 'Unknown',
        condition: {
          humidity: values.humidity,
          windSpeed: values.windSpeed,
          cloudCover: values.cloudCover,
          precipitationProbability: values.precipitationProbability,
          uvIndex: values.uvIndex || 0
        },
        timeOfDay,
        isFuture,
        targetDate: isFuture ? targetDate : dayjs(currentInterval.startTime).format('YYYY-MM-DD'),
        targetTime: isFuture ? targetTime : dayjs(currentInterval.startTime).format('HH:mm'),
        precipitationIntensity: values.rainIntensity || 0,
        query
      };

      // Get natural language response from AI, now including context
      console.log('Sending prompt params to analyzeWeatherData:', JSON.stringify(promptParams, null, 2));
      // Pass ChatService and userId to analyzeWeatherData
      const weatherAnalysis = await analyzeWeatherData(promptParams, chatService, userId);
      console.log('Weather analysis result:', JSON.stringify(weatherAnalysis, null, 2));

      const naturalResponse = weatherAnalysis.naturalResponse;
      const sessionId = weatherAnalysis.sessionId;

      // Create the final weather data response object
      const finalWeatherData: WeatherResponse = {
        location: locationParam,
        temperature: Math.round(values.temperature).toString(),
        condition: this.translateCondition(values.weatherCode || 1000),
        high: Math.round(values.temperatureMax || 0).toString(),
        low: Math.round(values.temperatureMin || 0).toString(),
        precipitation: `${Math.round(values.precipitationProbability * 100)}%`,
        humidity: `${Math.round(values.humidity * 100)}%`,
        windSpeed: `${Math.round(values.windSpeed)} mph`,
        weatherCode: values.weatherCode || 1000,
        naturalResponse: naturalResponse,
        currentTime: dayjs(currentInterval.startTime).format('YYYY-MM-DD HH:mm:ss')
      };

      console.log('Final response temperature:', finalWeatherData.temperature);

      return {
        weatherData: finalWeatherData,
        sessionId: sessionId
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('User with ID') && error.message.includes('not found')) {
          throw new Error('User authentication required to access weather information');
        }
      }
      throw error;
    }
  }

  async getWeatherQuery(location: string, query: string, language: string = 'en'): Promise<any> {
    try {
      // First get the current weather data
      const weatherData = await this.getWeather(location);

      // Here you would typically use an AI service (like OpenAI) to process the query
      // and generate a natural language response based on the weather data
      // For now, we'll return a simple response structure
      return {
        location: weatherData.location,
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        naturalResponse: `The current weather in ${weatherData.location} is ${weatherData.condition} with a temperature of ${weatherData.temperature}°F.`,
        query: query,
        language: language
      };
    } catch (error) {
      throw new Error('Failed to process weather query');
    }
  }
}