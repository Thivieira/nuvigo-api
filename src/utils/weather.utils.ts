import weatherCodeJson from "@/assets/weather-code.json";
import weatherFieldDescriptors from "@/assets/weather-field-descriptors.json";
import { WeatherCodes } from "@/types/weather.types";

const getWeatherDescription = (weatherCode: number) => {
  const parsedJson = weatherCodeJson as WeatherCodes;
  return parsedJson.weatherCode[weatherCode];
};

/**
 * Get a human-readable description of a weather condition based on its value and type
 */
const getWeatherConditionDescription = (field: string, value: number): string => {
  // Handle special cases with predefined descriptions
  if (field === 'precipitationType') {
    const types = (weatherFieldDescriptors as any).precipitationType;
    if (types && typeof types === 'object') {
      return types[value.toString()] || 'Unknown';
    }
  }

  if (field === 'moonPhase') {
    const phases = (weatherFieldDescriptors as any).moonPhase;
    if (phases && typeof phases === 'object') {
      return phases[value.toString()] || 'Unknown';
    }
  }

  // Handle numeric values with units
  const unit = (weatherFieldDescriptors as any)[field];
  if (typeof unit === 'string') {
    return `${value}${unit}`;
  }

  return `${value}`;
};

/**
 * Format weather data for natural language responses
 */
const formatWeatherDataForResponse = (values: any): Record<string, string> => {
  const result: Record<string, string> = {};

  // Extract and format key weather metrics
  const fieldsToInclude = [
    'temperature',
    'temperatureApparent',
    'humidity',
    'windSpeed',
    'windGust',
    'cloudCover',
    'precipitationProbability',
    'precipitationIntensity',
    'precipitationType',
    'visibility',
    'uvIndex',
    'pressureSeaLevel'
  ];

  fieldsToInclude.forEach(field => {
    if (values[field] !== undefined) {
      result[field] = getWeatherConditionDescription(field, values[field]);
    }
  });

  // Add weather description
  if (values.weatherCode !== undefined) {
    result.weatherDescription = getWeatherDescription(values.weatherCode);
  }

  return result;
};

export { getWeatherDescription, getWeatherConditionDescription, formatWeatherDataForResponse };