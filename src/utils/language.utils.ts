import dayjs from 'dayjs';

interface PromptParams {
  name: string;
  temperature: number;
  description: string;
  condition: {
    humidity: number;
    windSpeed: number;
    cloudCover: number;
    precipitationProbability: number;
    uvIndex: number;
  };
  timeOfDay: string;
  isFuture?: boolean;
  targetDate?: string;
  targetTime?: string;
}

export function getPromptFromLanguage(language: string, params: PromptParams): string {
  // Round the temperature to the nearest whole number
  const roundedTemperature = Math.round(params.temperature);

  // Create weather context with only defined values
  const weatherContext = [
    `temperature is ${roundedTemperature}°C`,
    `humidity is ${params.condition.humidity}%`,
    `wind speed is ${params.condition.windSpeed} km/h`,
    ...(params.condition.cloudCover ? [`cloud cover is ${params.condition.cloudCover}%`] : []),
    ...(params.condition.precipitationProbability ? [`precipitation probability is ${params.condition.precipitationProbability}%`] : []),
    ...(params.condition.uvIndex ? [`UV index is ${params.condition.uvIndex}`] : []),
    `it's ${params.timeOfDay}`
  ].join(', ');

  // Add appropriate suggestions based on conditions
  const suggestions = [];
  if (params.condition.precipitationProbability > 30) {
    suggestions.push('remind about taking an umbrella');
  }
  if (params.condition.uvIndex > 5 && params.timeOfDay !== 'night') {
    suggestions.push('remind about sun protection');
  }
  if (params.condition.windSpeed > 20) {
    suggestions.push('mention it might be windy');
  }
  if (params.condition.humidity > 70) {
    suggestions.push('mention it might feel humid');
  }

  const suggestionText = suggestions.length > 0
    ? ` and ${suggestions.join(', ')}`
    : '';

  // Get the day of the week from the target date
  const dayOfWeek = params.targetDate ? dayjs(params.targetDate).format('dddd') : '';

  switch (language) {
    case "en":
      return params.isFuture
        ? `The weather in ${params.name} on ${dayOfWeek} at ${params.targetTime} will have the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response about the future weather.`
        : `The current weather in ${params.name} has the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response.`;
    case "fr":
      return params.isFuture
        ? `La météo à ${params.name} ${dayOfWeek} à ${params.targetTime} aura les conditions suivantes: ${weatherContext}.${suggestionText} Rédige cette phrase en français de manière concise et amicale, en parlant du temps futur.`
        : `La météo actuelle à ${params.name} a les conditions suivantes: ${weatherContext}.${suggestionText} Rédige cette phrase en français de manière concise et amicale.`;
    case "es":
      return params.isFuture
        ? `La météo en ${params.name} el ${dayOfWeek} a las ${params.targetTime} tendrá las siguientes condiciones: ${weatherContext}.${suggestionText} Escribe esta frase en español de manera concisa y amigable, hablando del tiempo futuro.`
        : `La météo actual en ${params.name} tiene las siguientes condiciones: ${weatherContext}.${suggestionText} Escribe esta frase en español de manera concisa y amigable.`;
    case "pt-br":
      return params.isFuture
        ? `A temperatura em ${params.name} na ${dayOfWeek} às ${params.targetTime} terá as seguintes condições: ${weatherContext}.${suggestionText} Escreva esta frase em português brasileiro de maneira concisa e amigável, falando sobre o tempo futuro.`
        : `A temperatura atual em ${params.name} tem as seguintes condições: ${weatherContext}.${suggestionText} Escreva esta frase em português brasileiro de maneira concisa e amigável.`;
    default:
      return params.isFuture
        ? `The weather in ${params.name} on ${dayOfWeek} at ${params.targetTime} will have the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response about the future weather.`
        : `The current weather in ${params.name} has the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response.`;
  }
}
