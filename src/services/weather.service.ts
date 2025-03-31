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
      const description = getWeatherDescription(weatherData.weather.uvIndex);
      const prompt = getPromptFromLanguage(language, {
        name: weatherData.location.name,
        temperature: weatherData.weather.temperature,
        description,
      });
      const naturalResponse = await createOpenAIResponse(prompt);

      const roundedTemperature = Math.round(weatherData.weather.temperature);

      return {
        location: weatherData.location.name,
        temperature: `${roundedTemperature}°C`,
        condition: weatherData.weather,
        naturalResponse,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch weather data.');
    }
  }
}