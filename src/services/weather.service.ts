import { NotFoundException } from '@/exceptions'
import dayjs, { getTimeOfDay, TIMEZONE } from '@/lib/dayjs';
import { createOpenAIResponse } from '@/utils/openAI.utils';
import { analyzeWeatherData, PromptParams, analyzeDateWithHistory } from '@/utils/language.utils';
import { getWeatherDescription, formatWeatherDataForResponse } from '@/utils/weather.utils';
import { env } from '@/env';
import { ChatService } from "./chat.service";

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

interface TimelineResponse {
  data: {
    timelines: Array<{
      timestep: string;
      startTime: string;
      endTime: string;
      intervals: Array<{
        startTime: string;
        values: {
          cloudBase: number;
          cloudCeiling: number | null;
          cloudCover: number;
          humidity: number;
          precipitationIntensity: number;
          precipitationProbability: number;
          precipitationType: number;
          pressureSeaLevel: number;
          schuurClassification: number;
          temperature: number;
          temperatureApparent: number;
          visibility: number;
          windDirection: number;
          windGust: number;
          windSpeed: number;
        };
      }>;
    }>;
  };
}

interface WeatherResponse {
  location: string;
  temperature: string;
  condition: {
    cloudBase: number | null;
    cloudCeiling: number | null;
    cloudCover: number;
    dewPoint: number;
    freezingRainIntensity: number;
    humidity: number;
    precipitationProbability: number;
    pressureSeaLevel: number;
    pressureSurfaceLevel: number;
    rainIntensity: number;
    sleetIntensity: number;
    snowIntensity: number;
    temperature: number;
    temperatureApparent: number;
    uvHealthConcern: number;
    uvIndex: number;
    visibility: number;
    weatherCode: number;
    windDirection: number;
    windGust: number;
    windSpeed: number;
  };
  naturalResponse: string;
  currentTime: string;
  queryTime: string;
  targetTime: string;
}

interface Location {
  type?: 'Point';
  coordinates?: [number, number];
  name?: string;
}

interface WeatherQuery {
  location: string | Location;
  language?: string;
}

// Constants
const WEATHER_CODE_MAP: Record<number, number> = {
  1: 1000, // Clear
  2: 1001, // Partly Cloudy
  3: 1002, // Cloudy
  4: 1003, // Rain
  5: 1004, // Snow
  6: 1005, // Thunderstorm
};

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
        weatherResponse = await fetch(weatherUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timelineRequest),
        });
        console.log('Tomorrow.io API call completed with status:', weatherResponse.status);
      } catch (error: any) {
        console.error('Error calling Tomorrow.io API:', error);
        throw new Error(`Failed to fetch weather data: ${error.message}`);
      }

      if (!weatherResponse.ok) {
        const errorData = await weatherResponse.json();
        console.error('Tomorrow.io API Error:', {
          status: weatherResponse.status,
          statusText: weatherResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to fetch weather data: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }

      let weatherData;
      try {
        console.log('Parsing Tomorrow.io API response');
        weatherData = await weatherResponse.json();
        console.log('Weather data received successfully');
      } catch (error: any) {
        console.error('Error parsing Tomorrow.io API response:', error);
        throw new Error(`Failed to parse weather data: ${error.message}`);
      }

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
        temperature: `${values.temperature}°C`,
        condition: {
          ...condition,
          temperature: values.temperature
        },
        naturalResponse,
        currentTime: currentInterval.startTime,
        queryTime: queryTime.toISOString(),
        targetTime: isFuture ? targetDayjs.toISOString() : currentInterval.startTime
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
}