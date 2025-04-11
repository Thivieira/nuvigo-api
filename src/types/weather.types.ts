export interface WeatherQueryParams {
  location: string;
}

export interface FetchWeatherDataResponse {
  time: string;
  weather: TomorrowIoValues;
  location: TomorrowIoLocation;
}

export interface TomorrowIoValues {
  cloudBase: number;
  cloudCeiling: number;
  cloudCover: number;
  dewPoint: number;
  freezingRainIntensity: number;
  humidity: number;
  precipitationProbability: number;
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
}

export interface TomorrowIoLocation {
  lat: number;
  lon: number;
  name: string;
  type: string;
}

export interface TomorrowIoCondition {
  data: {
    time: string;
    values: TomorrowIoValues;
  },
  location: TomorrowIoLocation;
}

export interface WeatherCodes {
  weatherCode: Record<string, string>;
  weatherCodeFullDay: Record<string, string>;
  weatherCodeDay: Record<string, string>;
  weatherCodeNight: Record<string, string>;
}

export interface TomorrowIoRealtimeResponse {
  data: {
    time: string;
    values: TomorrowIoValues;
  };
  location: TomorrowIoLocation;
}
