import { NotFoundException } from '@/exceptions'
import dayjs, { getTimeOfDay } from '@/lib/dayjs';
import { createOpenAIResponse } from '@/utils/openAI.utils';
import { getPromptFromLanguage } from '@/utils/language.utils';
import { getWeatherDescription } from '@/utils/weather.utils';
import { env } from '@/env';

interface TimelineRequest {
  location: string | {
    type: 'Point';
    coordinates: [number, number];
  };
  fields: string[];
  timesteps: string[];
  startTime: string;
  endTime: string;
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

const TIME_OF_DAY_RANGES = {
  morning: { start: 8, end: 11 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 18, end: 21 },
  night: { start: 22, end: 5 }
};

const DEFAULT_FIELDS = [
  'temperature',
  'humidity',
  'windSpeed',
  'cloudCover',
  'precipitationProbability',
  'uvIndex'
];

// Helper functions
function formatLocationParam(location: string | Location): string {
  if (typeof location === 'string') {
    return location;
  }
  if (location.type === 'Point' && location.coordinates) {
    return `${location.coordinates[1]},${location.coordinates[0]}`;
  }
  if (location.name) {
    return location.name;
  }
  throw new NotFoundException('Invalid location format provided.');
}

function validateTimeRange(startTime: string, endTime: string): { startTime: string; endTime: string } {
  const now = dayjs();
  const start = startTime === 'now' ? now : dayjs(startTime);
  let end = endTime === 'now' ? now : dayjs(endTime);

  // Validate that the dates are valid
  if (!start.isValid() || !end.isValid()) {
    throw new NotFoundException('Invalid time format provided. Please use ISO 8601 format or "now".');
  }

  // Limit end time to 5 days from now
  const maxEndTime = now.add(5, 'days');
  if (end.isAfter(maxEndTime)) {
    end = maxEndTime;
  }

  // Set start time to now if it's in the past
  if (start.isBefore(now)) {
    return {
      startTime: now.toISOString(),
      endTime: end.toISOString()
    };
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString()
  };
}

function createQueryAnalysisPrompt(query: string, currentTime: string): string {
  return `Given the following weather query: "${query}"
  Current time: ${currentTime}
  
  Please analyze the query and return a JSON object with:
  1. targetDay: the day of the week (0-6, where 0 is Sunday)
  2. targetHour: the hour of the day (0-23)
  3. targetDate: the specific date in YYYY-MM-DD format
  4. explanation: a brief explanation of how you interpreted the query
  
  Important rules:
  - The target date must be within 5 days from the current time
  - For relative days (e.g., "tomorrow", "next Friday"), calculate the actual date
  - For times of day:
    * "morning" = 8-11
    * "afternoon" = 12-17
    * "evening" = 18-21
    * "night" = 22-5
  
  Example responses:
  {
    "targetDay": 5,
    "targetHour": 14,
    "targetDate": "2025-04-04",
    "explanation": "User asked about Friday afternoon, which is day 5 and typically around 2 PM"
  }
  or
  {
    "targetDay": 1,
    "targetHour": 9,
    "targetDate": "2025-04-02",
    "explanation": "User asked about tomorrow morning, which is Tuesday at 9 AM"
  }`;
}

function findMatchingInterval(intervals: any[], targetDate: string, targetHour: number): any {
  return intervals.find(interval => {
    const intervalTime = dayjs(interval.startTime);
    const intervalDate = intervalTime.format('YYYY-MM-DD');
    const intervalHour = intervalTime.hour();

    return intervalDate === targetDate && Math.abs(intervalHour - targetHour) <= 2;
  });
}

function createConditionObject(values: any): any {
  return {
    cloudBase: values.cloudBase,
    cloudCeiling: values.cloudCeiling,
    cloudCover: values.cloudCover,
    dewPoint: 0,
    freezingRainIntensity: 0,
    humidity: values.humidity,
    precipitationProbability: values.precipitationProbability,
    pressureSeaLevel: values.pressureSeaLevel,
    pressureSurfaceLevel: 0,
    rainIntensity: values.precipitationIntensity,
    sleetIntensity: 0,
    snowIntensity: 0,
    temperature: values.temperature,
    temperatureApparent: values.temperatureApparent,
    uvHealthConcern: 0,
    uvIndex: 0,
    visibility: values.visibility,
    weatherCode: WEATHER_CODE_MAP[values.schuurClassification] || 1000,
    windDirection: values.windDirection,
    windGust: values.windGust,
    windSpeed: values.windSpeed,
  };
}

export class WeatherService {
  async getWeather(query: WeatherQuery): Promise<WeatherResponse> {
    const request: TimelineRequest = {
      location: query.location as string | { type: 'Point'; coordinates: [number, number] },
      fields: DEFAULT_FIELDS,
      timesteps: ['current'],
      startTime: 'now',
      endTime: dayjs().add(1, 'hour').toISOString()
    };

    return this.getFlexibleWeather(request, 'current weather');
  }

  async getTimelineWeather(request: TimelineRequest): Promise<WeatherResponse> {
    // Convert "now" to ISO string if present
    const startTime = request.startTime === 'now' ? dayjs().toISOString() : request.startTime;
    const endTime = request.endTime === 'now' ? dayjs().toISOString() : request.endTime;

    const query = `weather from ${dayjs(startTime).format('dddd, HH:mm')} to ${dayjs(endTime).format('dddd, HH:mm')}`;
    return this.getFlexibleWeather(request, query);
  }

  async getFutureWeather(request: TimelineRequest, queryDate: string): Promise<WeatherResponse> {
    return this.getFlexibleWeather(request, queryDate);
  }

  async getFlexibleWeather(request: TimelineRequest, query: string): Promise<WeatherResponse> {
    const queryTime = dayjs();
    console.log('Query time:', queryTime.format('YYYY-MM-DD HH:mm:ss'));

    // Validate and adjust time range
    const { startTime, endTime } = validateTimeRange(request.startTime, request.endTime);
    request.startTime = startTime;
    request.endTime = endTime;

    // Format location parameter
    const locationParam = formatLocationParam(request.location);
    const locationName = typeof request.location === 'string'
      ? request.location
      : 'Point' in request.location
        ? `${request.location.coordinates[1]},${request.location.coordinates[0]}`
        : 'Unknown Location';

    // Analyze query using LLM
    const queryAnalysisPrompt = createQueryAnalysisPrompt(query, queryTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Query Analysis Prompt:', queryAnalysisPrompt);

    const queryAnalysis = await createOpenAIResponse(queryAnalysisPrompt);
    console.log('Raw Query Analysis:', queryAnalysis);

    const cleanResponse = queryAnalysis.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned Response:', cleanResponse);

    const analysis = JSON.parse(cleanResponse);
    console.log('Parsed Analysis:', analysis);

    // Validate target date
    const targetDateTime = dayjs(analysis.targetDate);
    const maxDate = queryTime.add(5, 'days');
    console.log('Date Validation:', {
      targetDate: targetDateTime.format('YYYY-MM-DD HH:mm:ss'),
      maxDate: maxDate.format('YYYY-MM-DD HH:mm:ss'),
      isWithinLimit: !targetDateTime.isAfter(maxDate)
    });

    if (targetDateTime.isAfter(maxDate)) {
      throw new NotFoundException('Weather data is only available for up to 5 days in the future.');
    }

    // Update request with target date range
    const targetStart = targetDateTime.startOf('day');
    const targetEnd = targetDateTime.endOf('day');
    request.startTime = targetStart.toISOString();
    request.endTime = targetEnd.toISOString();

    // Fetch weather data
    const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        location: locationParam,
        units: 'metric',
      }),
    });

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error('Tomorrow.io API Error:', errorData);
      throw new NotFoundException('Weather timeline data not found.');
    }

    const weatherData = await weatherResponse.json() as TimelineResponse;
    console.log('API Response:', JSON.stringify(weatherData, null, 2));

    if (!weatherData?.data?.timelines) {
      throw new NotFoundException('Weather timeline data not found.');
    }

    // Find matching interval
    const intervals = weatherData.data.timelines[0].intervals;
    console.log('Available Intervals:', intervals.map(i => ({
      time: dayjs(i.startTime).format('YYYY-MM-DD HH:mm:ss'),
      hour: dayjs(i.startTime).hour(),
      matchesDate: dayjs(i.startTime).format('YYYY-MM-DD') === analysis.targetDate,
      matchesHour: Math.abs(dayjs(i.startTime).hour() - analysis.targetHour) <= 2
    })));

    const targetInterval = findMatchingInterval(intervals, analysis.targetDate, analysis.targetHour);

    if (!targetInterval) {
      console.log('No matching interval found for:', {
        targetDate: analysis.targetDate,
        targetHour: analysis.targetHour,
        availableDates: intervals.map(i => dayjs(i.startTime).format('YYYY-MM-DD')),
        availableHours: intervals.map(i => dayjs(i.startTime).hour())
      });
      throw new NotFoundException('Weather data not found for the specified time.');
    }

    // Process weather data
    const futureTime = dayjs(targetInterval.startTime);
    const timeOfDay = getTimeOfDay(futureTime.hour());
    const condition = createConditionObject(targetInterval.values);

    // Generate natural language response
    const prompt = getPromptFromLanguage('pt', {
      name: locationName,
      temperature: targetInterval.values.temperature,
      description: getWeatherDescription(condition.weatherCode),
      condition: {
        humidity: targetInterval.values.humidity,
        windSpeed: targetInterval.values.windSpeed,
        cloudCover: targetInterval.values.cloudCover,
        precipitationProbability: targetInterval.values.precipitationProbability,
        uvIndex: 0,
      },
      timeOfDay,
      isFuture: true,
      targetDate: analysis.targetDate,
      targetTime: futureTime.format('HH:mm')
    });

    const naturalResponse = await createOpenAIResponse(prompt);
    console.log('Natural response:', naturalResponse);

    return {
      location: `${locationName}, Brasil`,
      temperature: `${Math.round(targetInterval.values.temperature)}°C`,
      condition,
      naturalResponse,
      currentTime: futureTime.format('HH:mm'),
      queryTime: queryTime.format('YYYY-MM-DD HH:mm:ss'),
      targetTime: futureTime.format('YYYY-MM-DD HH:mm:ss'),
    };
  }
}