import dayjs from 'dayjs';
import { createOpenAIResponse } from './openAI.utils';

export interface PromptParams {
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
  isFuture: boolean;
  targetDate: string;
  targetTime: string;
  precipitationIntensity?: number;
  query: string;
  explanation?: string;
}

export interface WeatherAnalysis {
  naturalResponse: string;
  analyzedTemperature?: number;
}

export async function detectLanguage(query: string): Promise<string> {
  const prompt = `Detect the language of the following query and return ONLY the language code (e.g., 'pt', 'en', 'es', 'fr'): "${query}"`;
  const response = await createOpenAIResponse(prompt);
  return response.trim().toLowerCase();
}

export async function getPromptFromLanguage(params: PromptParams): Promise<string> {
  const { name, temperature, description, condition, timeOfDay, isFuture, targetDate, targetTime, precipitationIntensity, query, explanation } = params;
  console.log('getPromptFromLanguage called with temperature:', temperature);

  // Detect the language of the query
  const language = await detectLanguage(query);
  console.log('Detected language:', language);

  const weatherData = `
    - Temperatura: ${temperature}°C
    - Condição: ${description}
    - Umidade: ${condition.humidity}%
    - Velocidade do vento: ${condition.windSpeed} km/h
    - Cobertura de nuvens: ${condition.cloudCover}%
    - Probabilidade de chuva: ${condition.precipitationProbability}%
    - Intensidade da precipitação: ${precipitationIntensity || 0} mm/h
    - Índice UV: ${condition.uvIndex}
    - Período do dia: ${timeOfDay}
    ${isFuture ? `- Data alvo: ${targetDate}` : ''}
    ${isFuture ? `- Horário alvo: ${targetTime}` : ''}
    ${explanation ? `- Interpretação da pergunta: ${explanation}` : ''}`;

  const instructions = `
    1. Responda diretamente à pergunta feita de forma clara e objetiva
    2. Mantenha um tom profissional mas acessível
    3. Evite mencionar números técnicos específicos (como porcentagens exatas) a menos que sejam essenciais
    4. Para perguntas sobre chuva:
       - Se a probabilidade for 0%, diga que não vai chover
       - Se a probabilidade for baixa (1-30%), diga que é improvável chover
       - Se a probabilidade for média (31-70%), diga que pode chover
       - Se a probabilidade for alta (71-99%), diga que provavelmente vai chover
       - Se a probabilidade for 100%, diga que vai chover com certeza
    5. Use termos mais naturais para descrever o tempo:
       - Em vez de "velocidade do vento de 1.4 km/h", diga "vento leve" ou "pouco vento"
       - Em vez de "umidade de 75%", diga "umidade moderada" ou "ar úmido"
       - Em vez de "cobertura de nuvens de 69%", diga "parcialmente nublado" ou "algumas nuvens"
    6. Seja conciso e direto - não precisa mencionar todos os detalhes técnicos
    7. Mantenha um tom neutro e informativo
    8. Se a pergunta for sobre chuva, comece a resposta com a informação sobre chuva
    9. Se a pergunta não for clara ou for ambígua, explique como você interpretou a pergunta
    10. Para perguntas sobre o tempo em geral, forneça um resumo breve das condições
    
    IMPORTANTE: Use os dados reais fornecidos acima, mas apresente-os de forma clara e objetiva.`;

  const languagePrompts: Record<string, { question: string; data: string; instructions: string }> = {
    pt: {
      question: 'Analise a seguinte pergunta sobre o clima:',
      data: 'Condições meteorológicas para',
      instructions: 'A resposta deve ser em português, com um tom profissional mas acessível.'
    },
    en: {
      question: 'Analyze the following weather question:',
      data: 'Weather conditions for',
      instructions: 'The response should be in English, with a professional but accessible tone.'
    },
    es: {
      question: 'Analiza la siguiente pregunta sobre el clima:',
      data: 'Condiciones meteorológicas para',
      instructions: 'La respuesta debe estar en español, con un tono profesional pero accesible.'
    },
    fr: {
      question: 'Analysez la question suivante sur la météo:',
      data: 'Conditions météorologiques pour',
      instructions: 'La réponse doit être en français, avec un ton professionnel mais accessible.'
    }
  };

  const prompt = languagePrompts[language] || languagePrompts.en;

  const finalPrompt = `${prompt.question} "${query}"

    ${prompt.data} ${name}:
    ${weatherData}
    
    Por favor, analise a pergunta e forneça uma resposta apropriada que:
    ${instructions}
    
    ${prompt.instructions}`;

  console.log('Generated prompt:', finalPrompt);
  return finalPrompt;
}

export async function analyzeWeatherData(params: PromptParams): Promise<WeatherAnalysis> {
  console.log('Starting weather analysis with params:', JSON.stringify(params, null, 2));

  const prompt = await getPromptFromLanguage(params);
  console.log('Generated prompt for weather analysis:', prompt);

  const response = await createOpenAIResponse(prompt);
  console.log('Raw AI response:', response);

  // Use the original temperature from the API without any AI analysis
  return {
    naturalResponse: response.trim(),
    analyzedTemperature: params.temperature
  };
}
