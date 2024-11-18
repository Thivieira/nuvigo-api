export function getPromptFromLanguage(
  language: string,
  { name, temperature, description }: { name: string; temperature: number; description: string }
) {
  // Round the temperature to the nearest whole number
  const roundedTemperature = Math.round(temperature);

  // Check if it's raining to suggest an umbrella
  const umbrellaSuggestion = description.toLowerCase().includes("rain")
    ? " add a way to remind the user to take an umbrella in the preferred language"
    : "";

  switch (language) {
    case "en":
      return `The current weather in ${name} is ${roundedTemperature}°C and ${description}.${umbrellaSuggestion} Write this as a concise and friendly response.`;
    case "fr":
      return `La météo actuelle à ${name} est de ${roundedTemperature}°C et ${description}.${umbrellaSuggestion} Rédige cette phrase en français de manière concise et amicale.`;
    case "es":
      return `La météo actual en ${name} es de ${roundedTemperature}°C y ${description}.${umbrellaSuggestion} Escribe esta frase en español de manera concisa y amigable.`;
    case "pt-br":
      return `A temperatura atual em ${name} é de ${roundedTemperature}°C e ${description}.${umbrellaSuggestion} Escreva esta frase em português brasileiro de maneira concisa e amigável.`;
    default:
      return `The current weather in ${name} is ${roundedTemperature}°C and ${description}.${umbrellaSuggestion} Write this as a concise and friendly response.`;
  }
}
