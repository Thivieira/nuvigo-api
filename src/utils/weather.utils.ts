import weatherCodeJson from "@/assets/weather-code.json";
import { WeatherCodes } from "@/types/weather.types";

const getWeatherDescription = (weatherCode: number) => {
  const parsedJson = weatherCodeJson as WeatherCodes;
  return parsedJson.weatherCode[weatherCode];
};

export { getWeatherDescription };