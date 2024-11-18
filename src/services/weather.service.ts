import { HTTPException } from 'hono/http-exception';
import { TOMORROW_API_KEY } from '../config';
import { FetchWeatherDataResponse, TomorrowIoCondition } from '../types/weather.types';

const fetchWeatherData = async (location: string): Promise<FetchWeatherDataResponse> => {
  const units = 'metric';
  const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${location}&units=${units}&apikey=${TOMORROW_API_KEY}`;
  console.log(weatherUrl);
  const weatherResponse = await fetch(
    weatherUrl
  );

  if (!weatherResponse.ok) {
    throw new HTTPException(404, { message: 'Weather data not found.' });
  }

  const weatherData = await weatherResponse.json() as TomorrowIoCondition;

  if (!weatherData || !weatherData.data) {
    throw new HTTPException(404, { message: 'Weather data not found.' });
  }

  return { time: weatherData.data.time, weather: weatherData.data.values, location: weatherData.location };
};

export { fetchWeatherData };