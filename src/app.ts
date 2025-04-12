import { PrismaClient } from '@prisma/client';
import { ChatService } from '@/services/chat.service';
import { WeatherService } from '@/services/weather.service';
import { ChatController } from '@/controllers/chat.controller';
import { WeatherController } from '@/controllers/weather.controller';
import { AIService } from '@/services/ai.service';

const prisma = new PrismaClient();
const chatService = new ChatService(prisma);
const weatherService = new WeatherService();
const aiService = new AIService(process.env.OPENAI_API_KEY || '');
const chatController = new ChatController(chatService, weatherService);
const weatherController = new WeatherController(weatherService, chatService, aiService); 