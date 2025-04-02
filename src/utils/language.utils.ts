export function getPromptFromLanguage(
  language: string,
  {
    name,
    temperature,
    description,
    condition
  }: {
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
  }
) {
  // Round the temperature to the nearest whole number
  const roundedTemperature = Math.round(temperature);

  // Create weather context
  const weatherContext = [
    `temperature is ${roundedTemperature}°C`,
    `humidity is ${condition.humidity}%`,
    `wind speed is ${condition.windSpeed} km/h`,
    `cloud cover is ${condition.cloudCover}%`,
    `precipitation probability is ${condition.precipitationProbability}%`,
    `UV index is ${condition.uvIndex}`
  ].join(', ');

  // Add appropriate suggestions based on conditions
  const suggestions = [];
  if (condition.precipitationProbability > 30) {
    suggestions.push('remind about taking an umbrella');
  }
  if (condition.uvIndex > 5) {
    suggestions.push('remind about sun protection');
  }
  if (condition.windSpeed > 20) {
    suggestions.push('mention it might be windy');
  }
  if (condition.humidity > 70) {
    suggestions.push('mention it might feel humid');
  }

  const suggestionText = suggestions.length > 0
    ? ` and ${suggestions.join(', ')}`
    : '';

  switch (language) {
    case "en":
      return `The current weather in ${name} has the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response.`;
    case "fr":
      return `La météo actuelle à ${name} a les conditions suivantes: ${weatherContext}.${suggestionText} Rédige cette phrase en français de manière concise et amicale.`;
    case "es":
      return `La météo actual en ${name} tiene las siguientes condiciones: ${weatherContext}.${suggestionText} Escribe esta frase en español de manera concisa y amigable.`;
    case "pt-br":
      return `A temperatura atual em ${name} tem as seguintes condições: ${weatherContext}.${suggestionText} Escreva esta frase em português brasileiro de maneira concisa e amigável.`;
    default:
      return `The current weather in ${name} has the following conditions: ${weatherContext}.${suggestionText} Write this as a concise and friendly response.`;
  }
}
