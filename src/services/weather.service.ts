import { env } from '@/env';
import { WeatherData, WeatherQuery, WeatherResponse, TomorrowIoCondition } from '@/types/weather';
import { createOpenAIResponse } from '@/utils/openAI.utils';
import { getWeatherDescription } from '@/utils/weather.utils';
import { getPromptFromLanguage } from '@/utils/language.utils';
import { InternalServerErrorException, NotFoundException } from '@/exceptions'


export class WeatherService {
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    const units = 'metric';
    const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${location}&units=${units}&apikey=${env.TOMORROW_API_KEY}`;

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
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch weather data.');
    }
  }
}