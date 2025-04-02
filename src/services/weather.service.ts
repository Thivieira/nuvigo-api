import { InternalServerErrorException, NotFoundException } from '@/exceptions'
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

interface WeatherData {
  time: string;
  weather: {
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
  location: {
    name: string;
  };
}

interface TomorrowIoCondition {
  data: {
    time: string;
    values: {
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
  };
  location: {
    name: string;
  };
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

export class WeatherService {
  private async fetchWeatherData(location: string | Location): Promise<WeatherData> {
    const units = 'metric';

    // Handle different location formats
    let locationParam: string;
    if (typeof location === 'string') {
      // If it's a city name or string location
      locationParam = location;
    } else if (location.coordinates) {
      // If it's a coordinate-based location
      locationParam = `${location.coordinates[1]},${location.coordinates[0]}`;
    } else if (location.name) {
      // If it's a location object with a name
      locationParam = location.name;
    } else {
      throw new NotFoundException('Invalid location format provided.');
    }

    const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${encodeURIComponent(locationParam)}&units=${units}&apikey=${env.TOMORROW_API_KEY}`;

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new NotFoundException('Weather data not found.');
    }

    const weatherData = await weatherResponse.json() as TomorrowIoCondition;

    if (!weatherData || !weatherData.data) {
      throw new NotFoundException('Weather data not found.');
    }

    return {
      time: weatherData.data.time,
      weather: weatherData.data.values,
      location: weatherData.location,
    };
  }

  async getWeather(query: WeatherQuery): Promise<WeatherResponse> {
    const { location, language = 'en' } = query;

    try {
      const weatherData = await this.fetchWeatherData(location);
      console.log('Weather data:', weatherData);
      const description = getWeatherDescription(weatherData.weather.weatherCode);

      // Get time of day based on local time
      const localTime = dayjs(weatherData.time).utc().local();
      const timeOfDay = getTimeOfDay(localTime.hour());

      const prompt = getPromptFromLanguage(language, {
        name: weatherData.location.name,
        temperature: weatherData.weather.temperature,
        description,
        condition: {
          humidity: weatherData.weather.humidity,
          windSpeed: weatherData.weather.windSpeed,
          cloudCover: weatherData.weather.cloudCover,
          precipitationProbability: weatherData.weather.precipitationProbability,
          uvIndex: weatherData.weather.uvIndex,
        },
        timeOfDay,
      });
      const naturalResponse = await createOpenAIResponse(prompt);

      const roundedTemperature = Math.round(weatherData.weather.temperature);

      // Create a properly structured condition object
      const condition = {
        cloudBase: weatherData.weather.cloudBase,
        cloudCeiling: weatherData.weather.cloudCeiling,
        cloudCover: weatherData.weather.cloudCover,
        dewPoint: weatherData.weather.dewPoint,
        freezingRainIntensity: weatherData.weather.freezingRainIntensity,
        humidity: weatherData.weather.humidity,
        precipitationProbability: weatherData.weather.precipitationProbability,
        pressureSeaLevel: weatherData.weather.pressureSeaLevel,
        pressureSurfaceLevel: weatherData.weather.pressureSurfaceLevel,
        rainIntensity: weatherData.weather.rainIntensity,
        sleetIntensity: weatherData.weather.sleetIntensity,
        snowIntensity: weatherData.weather.snowIntensity,
        temperature: weatherData.weather.temperature,
        temperatureApparent: weatherData.weather.temperatureApparent,
        uvHealthConcern: weatherData.weather.uvHealthConcern,
        uvIndex: weatherData.weather.uvIndex,
        visibility: weatherData.weather.visibility,
        weatherCode: weatherData.weather.weatherCode,
        windDirection: weatherData.weather.windDirection,
        windGust: weatherData.weather.windGust,
        windSpeed: weatherData.weather.windSpeed,
      };

      return {
        location: weatherData.location.name,
        temperature: `${roundedTemperature}°C`,
        condition,
        naturalResponse,
        currentTime: localTime.format('HH:mm'),
        queryTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        targetTime: localTime.format('YYYY-MM-DD HH:mm:ss'),
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch weather data.');
    }
  }

  async getTimelineWeather(request: TimelineRequest): Promise<WeatherResponse> {
    const units = 'metric';
    const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;

    // Format location parameter based on input type
    let locationParam: string;
    if (typeof request.location === 'string') {
      // If it's a city name or string location
      locationParam = request.location;
    } else if (request.location.type === 'Point' && request.location.coordinates) {
      // If it's a coordinate-based location
      locationParam = `${request.location.coordinates[1]},${request.location.coordinates[0]}`;
    } else {
      throw new NotFoundException('Invalid location format provided.');
    }

    // Validate and adjust the time range
    const now = dayjs();
    const startTime = dayjs(request.startTime);
    let endTime = dayjs(request.endTime);

    // If endTime is more than 5 days ahead, limit it to 5 days from now
    const maxEndTime = now.add(5, 'days');
    if (endTime.isAfter(maxEndTime)) {
      endTime = maxEndTime;
    }

    // If startTime is in the past, set it to now
    if (startTime.isBefore(now)) {
      request.startTime = now.toISOString();
    }

    const weatherResponse = await fetch(weatherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        location: locationParam,
        units,
        endTime: endTime.toISOString(),
      }),
    });

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error('Tomorrow.io API Error:', errorData);
      throw new NotFoundException('Weather timeline data not found.');
    }

    const weatherData = await weatherResponse.json() as TimelineResponse;
    // console.log('API Response:', JSON.stringify(weatherData, null, 2));

    if (!weatherData || !weatherData.data || !weatherData.data.timelines) {
      throw new NotFoundException('Weather timeline data not found.');
    }

    // Get all intervals from the timeline
    const intervals = weatherData.data.timelines[0].intervals;

    // Find the interval that matches the current time
    const currentInterval = intervals.find(interval => {
      const intervalTime = dayjs(interval.startTime);
      const now = dayjs();
      return intervalTime.isSame(now, 'hour');
    });

    if (!currentInterval) {
      throw new NotFoundException('Current weather data not found in timeline.');
    }

    const currentValues = currentInterval.values;
    console.log('Current values:', JSON.stringify(currentValues, null, 2));

    // Get the current time from the matching interval
    const currentTime = dayjs(currentInterval.startTime);
    const timeOfDay = getTimeOfDay(currentTime.hour());
    console.log('Current time:', currentTime.format('HH:mm'));
    console.log('Time of day:', timeOfDay);

    // Map schuurClassification to weatherCode
    // 1 = Clear, 2 = Partly Cloudy, 3 = Cloudy, 4 = Rain, 5 = Snow, 6 = Thunderstorm
    const weatherCodeMap: Record<number, number> = {
      1: 1000, // Clear
      2: 1001, // Partly Cloudy
      3: 1002, // Cloudy
      4: 1003, // Rain
      5: 1004, // Snow
      6: 1005, // Thunderstorm
    };

    const weatherCode = weatherCodeMap[currentValues.schuurClassification] || 1000;

    // Create a condition object similar to the other endpoint
    const condition = {
      cloudBase: currentValues.cloudBase,
      cloudCeiling: currentValues.cloudCeiling,
      cloudCover: currentValues.cloudCover,
      dewPoint: 0, // Not available in timeline API
      freezingRainIntensity: 0, // Not available in timeline API
      humidity: currentValues.humidity,
      precipitationProbability: currentValues.precipitationProbability,
      pressureSeaLevel: currentValues.pressureSeaLevel,
      pressureSurfaceLevel: 0, // Not available in timeline API
      rainIntensity: currentValues.precipitationIntensity,
      sleetIntensity: 0, // Not available in timeline API
      snowIntensity: 0, // Not available in timeline API
      temperature: currentValues.temperature,
      temperatureApparent: currentValues.temperatureApparent,
      uvHealthConcern: 0, // Not available in timeline API
      uvIndex: 0, // Not available in timeline API
      visibility: currentValues.visibility,
      weatherCode,
      windDirection: currentValues.windDirection,
      windGust: currentValues.windGust,
      windSpeed: currentValues.windSpeed,
    };

    // Create a natural language response
    const prompt = getPromptFromLanguage('pt', {
      name: 'Rio de Janeiro',
      temperature: currentValues.temperature,
      description: getWeatherDescription(weatherCode),
      condition: {
        humidity: currentValues.humidity,
        windSpeed: currentValues.windSpeed,
        cloudCover: currentValues.cloudCover,
        precipitationProbability: currentValues.precipitationProbability,
        uvIndex: 0, // Not available in timeline API
      },
      timeOfDay,
    });

    const naturalResponse = await createOpenAIResponse(prompt);
    console.log('Natural response:', naturalResponse);

    const roundedTemperature = Math.round(currentValues.temperature);

    return {
      location: 'Rio de Janeiro, Região Sudeste, Brasil',
      temperature: `${roundedTemperature}°C`,
      condition,
      naturalResponse,
      currentTime: currentTime.format('HH:mm'),
      queryTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      targetTime: currentTime.format('YYYY-MM-DD HH:mm:ss'),
    };
  }

  async getFutureWeather(request: TimelineRequest, queryDate: string): Promise<WeatherResponse> {
    const units = 'metric';
    const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;

    const weatherResponse = await fetch(weatherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        units,
      }),
    });

    if (!weatherResponse.ok) {
      throw new NotFoundException('Weather timeline data not found.');
    }

    const weatherData = await weatherResponse.json() as TimelineResponse;
    // console.log('API Response:', JSON.stringify(weatherData, null, 2));

    if (!weatherData || !weatherData.data || !weatherData.data.timelines) {
      throw new NotFoundException('Weather timeline data not found.');
    }

    // Get all intervals from the timeline
    const intervals = weatherData.data.timelines[0].intervals;

    // Create a prompt for the LLM to understand the query and find the right interval
    const queryAnalysisPrompt = `Given the following weather query: "${queryDate}"
    Current time: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
    Available time intervals: ${JSON.stringify(intervals.map(i => ({
      time: i.startTime,
      day: dayjs(i.startTime).format('dddd'),
      hour: dayjs(i.startTime).format('HH:mm'),
      date: dayjs(i.startTime).format('YYYY-MM-DD')
    })))}
    
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

    console.log('Query Analysis Prompt:', queryAnalysisPrompt);
    const queryAnalysis = await createOpenAIResponse(queryAnalysisPrompt);
    console.log('Raw Query Analysis:', queryAnalysis);

    // Parse the LLM's response, removing any markdown formatting
    const cleanResponse = queryAnalysis.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned Response:', cleanResponse);
    const analysis = JSON.parse(cleanResponse);
    console.log('Parsed Analysis:', {
      targetDay: analysis.targetDay,
      targetHour: analysis.targetHour,
      targetDate: analysis.targetDate,
      explanation: analysis.explanation
    });

    const { targetDay, targetHour, targetDate } = analysis;

    // Validate that the target date is within 5 days
    const targetDateTime = dayjs(targetDate);
    const maxDate = dayjs().add(5, 'days');
    console.log('Date Validation:', {
      targetDate: targetDateTime.format('YYYY-MM-DD HH:mm:ss'),
      maxDate: maxDate.format('YYYY-MM-DD HH:mm:ss'),
      isWithinLimit: !targetDateTime.isAfter(maxDate)
    });

    if (targetDateTime.isAfter(maxDate)) {
      throw new NotFoundException('Weather data is only available for up to 5 days in the future.');
    }

    // Find the interval that matches the target date and time
    console.log('Available Intervals:', intervals.map(i => ({
      time: dayjs(i.startTime).format('YYYY-MM-DD HH:mm:ss'),
      hour: dayjs(i.startTime).hour(),
      matchesDate: dayjs(i.startTime).format('YYYY-MM-DD') === targetDate,
      matchesHour: Math.abs(dayjs(i.startTime).hour() - targetHour) <= 2
    })));

    const targetInterval = intervals.find(interval => {
      const intervalTime = dayjs(interval.startTime);
      const intervalDate = intervalTime.format('YYYY-MM-DD');
      const intervalHour = intervalTime.hour();

      // Check if it matches the target date and hour (within 2 hours)
      const matches = intervalDate === targetDate && Math.abs(intervalHour - targetHour) <= 2;
      console.log('Interval Check:', {
        intervalTime: intervalTime.format('YYYY-MM-DD HH:mm:ss'),
        intervalDate,
        intervalHour,
        targetDate,
        targetHour,
        matches
      });
      return matches;
    });

    if (!targetInterval) {
      console.log('No matching interval found for:', {
        targetDate,
        targetHour,
        availableDates: intervals.map(i => dayjs(i.startTime).format('YYYY-MM-DD')),
        availableHours: intervals.map(i => dayjs(i.startTime).hour())
      });
      throw new NotFoundException('Weather data not found for the specified time.');
    }

    console.log('Found matching interval:', {
      time: dayjs(targetInterval.startTime).format('YYYY-MM-DD HH:mm:ss'),
      values: targetInterval.values
    });

    const futureValues = targetInterval.values;
    console.log('Future values:', JSON.stringify(futureValues, null, 2));

    // Get the time from the matching interval
    const futureTime = dayjs(targetInterval.startTime);
    const timeOfDay = getTimeOfDay(futureTime.hour());
    console.log('Future time:', futureTime.format('HH:mm'));
    console.log('Time of day:', timeOfDay);

    // Map schuurClassification to weatherCode
    const weatherCodeMap: Record<number, number> = {
      1: 1000, // Clear
      2: 1001, // Partly Cloudy
      3: 1002, // Cloudy
      4: 1003, // Rain
      5: 1004, // Snow
      6: 1005, // Thunderstorm
    };

    const weatherCode = weatherCodeMap[futureValues.schuurClassification] || 1000;

    // Create a condition object
    const condition = {
      cloudBase: futureValues.cloudBase,
      cloudCeiling: futureValues.cloudCeiling,
      cloudCover: futureValues.cloudCover,
      dewPoint: 0, // Not available in timeline API
      freezingRainIntensity: 0, // Not available in timeline API
      humidity: futureValues.humidity,
      precipitationProbability: futureValues.precipitationProbability,
      pressureSeaLevel: futureValues.pressureSeaLevel,
      pressureSurfaceLevel: 0, // Not available in timeline API
      rainIntensity: futureValues.precipitationIntensity,
      sleetIntensity: 0, // Not available in timeline API
      snowIntensity: 0, // Not available in timeline API
      temperature: futureValues.temperature,
      temperatureApparent: futureValues.temperatureApparent,
      uvHealthConcern: 0, // Not available in timeline API
      uvIndex: 0, // Not available in timeline API
      visibility: futureValues.visibility,
      weatherCode,
      windDirection: futureValues.windDirection,
      windGust: futureValues.windGust,
      windSpeed: futureValues.windSpeed,
    };

    // Create a natural language response for future weather
    const prompt = getPromptFromLanguage('pt', {
      name: 'Rio de Janeiro',
      temperature: futureValues.temperature,
      description: getWeatherDescription(weatherCode),
      condition: {
        humidity: futureValues.humidity,
        windSpeed: futureValues.windSpeed,
        cloudCover: futureValues.cloudCover,
        precipitationProbability: futureValues.precipitationProbability,
        uvIndex: 0, // Not available in timeline API
      },
      timeOfDay,
      isFuture: true,
      targetDate: targetDate,
      targetTime: futureTime.format('HH:mm')
    });

    const naturalResponse = await createOpenAIResponse(prompt);
    console.log('Natural response:', naturalResponse);

    const roundedTemperature = Math.round(futureValues.temperature);

    return {
      location: 'Rio de Janeiro, Região Sudeste, Brasil',
      temperature: `${roundedTemperature}°C`,
      condition,
      naturalResponse,
      currentTime: futureTime.format('HH:mm'),
      queryTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      targetTime: futureTime.format('YYYY-MM-DD HH:mm:ss'),
    };
  }

  async getFlexibleWeather(request: TimelineRequest, query: string): Promise<WeatherResponse> {
    const units = 'metric';
    const weatherUrl = `https://api.tomorrow.io/v4/timelines?apikey=${env.TOMORROW_API_KEY}`;

    // Get the current time when the query is made
    const queryTime = dayjs();
    console.log('Query time:', queryTime.format('YYYY-MM-DD HH:mm:ss'));

    // Validate and adjust the time range
    const now = dayjs();
    const startTime = dayjs(request.startTime);
    let endTime = dayjs(request.endTime);

    // If endTime is more than 5 days ahead, limit it to 5 days from now
    const maxEndTime = now.add(5, 'days');
    if (endTime.isAfter(maxEndTime)) {
      endTime = maxEndTime;
    }

    // If startTime is in the past, set it to now
    if (startTime.isBefore(now)) {
      request.startTime = now.toISOString();
    }

    // Format location parameter based on input type
    let locationParam: string;
    if (typeof request.location === 'string') {
      locationParam = request.location;
    } else if (request.location.type === 'Point' && request.location.coordinates) {
      locationParam = `${request.location.coordinates[1]},${request.location.coordinates[0]}`;
    } else {
      throw new NotFoundException('Invalid location format provided.');
    }

    // Create a prompt for the LLM to understand the query and find the right interval
    const queryAnalysisPrompt = `Given the following weather query: "${query}"
    Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}
    
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

    console.log('Query Analysis Prompt:', queryAnalysisPrompt);
    const queryAnalysis = await createOpenAIResponse(queryAnalysisPrompt);
    console.log('Raw Query Analysis:', queryAnalysis);

    // Parse the LLM's response, removing any markdown formatting
    const cleanResponse = queryAnalysis.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned Response:', cleanResponse);
    const analysis = JSON.parse(cleanResponse);
    console.log('Parsed Analysis:', {
      targetDay: analysis.targetDay,
      targetHour: analysis.targetHour,
      targetDate: analysis.targetDate,
      explanation: analysis.explanation
    });

    const { targetDay, targetHour, targetDate } = analysis;

    // Validate that the target date is within 5 days
    const targetDateTime = dayjs(targetDate);
    const maxDate = now.add(5, 'days');
    console.log('Date Validation:', {
      targetDate: targetDateTime.format('YYYY-MM-DD HH:mm:ss'),
      maxDate: maxDate.format('YYYY-MM-DD HH:mm:ss'),
      isWithinLimit: !targetDateTime.isAfter(maxDate)
    });

    if (targetDateTime.isAfter(maxDate)) {
      throw new NotFoundException('Weather data is only available for up to 5 days in the future.');
    }

    // Update the request with the target date range
    const targetStart = targetDateTime.startOf('day');
    const targetEnd = targetDateTime.endOf('day');
    request.startTime = targetStart.toISOString();
    request.endTime = targetEnd.toISOString();

    console.log('Updated request time range:', {
      startTime: request.startTime,
      endTime: request.endTime
    });

    const weatherResponse = await fetch(weatherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        location: locationParam,
        units,
      }),
    });

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error('Tomorrow.io API Error:', errorData);
      throw new NotFoundException('Weather timeline data not found.');
    }

    const weatherData = await weatherResponse.json() as TimelineResponse;
    console.log('API Response:', JSON.stringify(weatherData, null, 2));

    if (!weatherData || !weatherData.data || !weatherData.data.timelines) {
      throw new NotFoundException('Weather timeline data not found.');
    }

    // Get all intervals from the timeline
    const intervals = weatherData.data.timelines[0].intervals;

    // Find the interval that matches the target date and time
    console.log('Available Intervals:', intervals.map(i => ({
      time: dayjs(i.startTime).format('YYYY-MM-DD HH:mm:ss'),
      hour: dayjs(i.startTime).hour(),
      matchesDate: dayjs(i.startTime).format('YYYY-MM-DD') === targetDate,
      matchesHour: Math.abs(dayjs(i.startTime).hour() - targetHour) <= 2
    })));

    const targetInterval = intervals.find(interval => {
      const intervalTime = dayjs(interval.startTime);
      const intervalDate = intervalTime.format('YYYY-MM-DD');
      const intervalHour = intervalTime.hour();

      // Check if it matches the target date and hour (within 2 hours)
      const matches = intervalDate === targetDate && Math.abs(intervalHour - targetHour) <= 2;
      console.log('Interval Check:', {
        intervalTime: intervalTime.format('YYYY-MM-DD HH:mm:ss'),
        intervalDate,
        intervalHour,
        targetDate,
        targetHour,
        matches
      });
      return matches;
    });

    if (!targetInterval) {
      console.log('No matching interval found for:', {
        targetDate,
        targetHour,
        availableDates: intervals.map(i => dayjs(i.startTime).format('YYYY-MM-DD')),
        availableHours: intervals.map(i => dayjs(i.startTime).hour())
      });
      throw new NotFoundException('Weather data not found for the specified time.');
    }

    console.log('Found matching interval:', {
      time: dayjs(targetInterval.startTime).format('YYYY-MM-DD HH:mm:ss'),
      values: targetInterval.values
    });

    const futureValues = targetInterval.values;
    console.log('Future values:', JSON.stringify(futureValues, null, 2));

    // Get the time from the matching interval
    const futureTime = dayjs(targetInterval.startTime);
    const timeOfDay = getTimeOfDay(futureTime.hour());
    console.log('Target time:', futureTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Time of day:', timeOfDay);

    // Map schuurClassification to weatherCode
    const weatherCodeMap: Record<number, number> = {
      1: 1000, // Clear
      2: 1001, // Partly Cloudy
      3: 1002, // Cloudy
      4: 1003, // Rain
      5: 1004, // Snow
      6: 1005, // Thunderstorm
    };

    const weatherCode = weatherCodeMap[futureValues.schuurClassification] || 1000;

    // Create a condition object
    const condition = {
      cloudBase: futureValues.cloudBase,
      cloudCeiling: futureValues.cloudCeiling,
      cloudCover: futureValues.cloudCover,
      dewPoint: 0, // Not available in timeline API
      freezingRainIntensity: 0, // Not available in timeline API
      humidity: futureValues.humidity,
      precipitationProbability: futureValues.precipitationProbability,
      pressureSeaLevel: futureValues.pressureSeaLevel,
      pressureSurfaceLevel: 0, // Not available in timeline API
      rainIntensity: futureValues.precipitationIntensity,
      sleetIntensity: 0, // Not available in timeline API
      snowIntensity: 0, // Not available in timeline API
      temperature: futureValues.temperature,
      temperatureApparent: futureValues.temperatureApparent,
      uvHealthConcern: 0, // Not available in timeline API
      uvIndex: 0, // Not available in timeline API
      visibility: futureValues.visibility,
      weatherCode,
      windDirection: futureValues.windDirection,
      windGust: futureValues.windGust,
      windSpeed: futureValues.windSpeed,
    };

    // Create a natural language response for future weather
    const prompt = getPromptFromLanguage('pt', {
      name: 'Rio de Janeiro',
      temperature: futureValues.temperature,
      description: getWeatherDescription(weatherCode),
      condition: {
        humidity: futureValues.humidity,
        windSpeed: futureValues.windSpeed,
        cloudCover: futureValues.cloudCover,
        precipitationProbability: futureValues.precipitationProbability,
        uvIndex: 0, // Not available in timeline API
      },
      timeOfDay,
      isFuture: true,
      targetDate: targetDate,
      targetTime: futureTime.format('HH:mm')
    });

    const naturalResponse = await createOpenAIResponse(prompt);
    console.log('Natural response:', naturalResponse);

    const roundedTemperature = Math.round(futureValues.temperature);

    return {
      location: 'Rio de Janeiro, Região Sudeste, Brasil',
      temperature: `${roundedTemperature}°C`,
      condition,
      naturalResponse,
      currentTime: futureTime.format('HH:mm'),
      queryTime: queryTime.format('YYYY-MM-DD HH:mm:ss'),
      targetTime: futureTime.format('YYYY-MM-DD HH:mm:ss'),
    };
  }
}