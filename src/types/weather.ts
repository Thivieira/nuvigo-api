export interface WeatherData {
  time: string;
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressureSurfaceLevel: number;
    uvIndex: number;
  };
  location: {
    name: string;
    lat: number;
    lon: number;
  };
}

export interface WeatherQuery {
  location: string;
  language?: string;
}

export interface WeatherResponse {
  location: string;
  temperature: string;
  condition: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressureSurfaceLevel: number;
    uvIndex: number;
  };
  naturalResponse: string;
}

export interface TomorrowIoCondition {
  data: {
    time: string;
    values: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      windDirection: number;
      precipitation: number;
      pressureSurfaceLevel: number;
      uvIndex: number;
    };
  };
  location: {
    name: string;
    lat: number;
    lon: number;
  };
} 