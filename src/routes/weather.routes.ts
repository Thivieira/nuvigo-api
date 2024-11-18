import { HTTPException } from 'hono/http-exception';
import { fetchWeatherData } from '../services/weather.service';
import { createOpenAIResponse } from '../utils/openAI.utils';
import { getWeatherDescription } from '../utils/weather.utils';
import { getPromptFromLanguage } from '../utils/language.utils';
import { Hono } from 'hono';

const weatherRoutes = new Hono();

weatherRoutes.get('/', async (c) => {
  const { location, language } = c.req.query();

  if (!location) {
    throw new HTTPException(400, { message: 'Location query is required.' });
  }

  let usedLanguage = 'en';

  if (language) {
    usedLanguage = language;
  }

  try {
    const weatherData = await fetchWeatherData(location);
    const description = getWeatherDescription(weatherData.weather.weatherCode);
    const prompt = getPromptFromLanguage(usedLanguage, { name: weatherData.location.name, temperature: weatherData.weather.temperature, description });
    const naturalResponse = await createOpenAIResponse(prompt);

    const roundedTemperature = Math.round(weatherData.weather.temperature);

    return c.json({
      location: weatherData.location.name,
      temperature: `${roundedTemperature}°C`,
      condition: weatherData.weather,
      naturalResponse
    });
  } catch (error) {
    console.error(error);
    throw new HTTPException(500, { message: 'Internal server error.' });
  }
});

export { weatherRoutes };
