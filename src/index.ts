import Fastify from 'fastify';
import weatherRoutes from './routes/weather.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import authRoutes from './routes/auth.routes';
import { locationRoutes } from './routes/location.routes';
import registerPlugins from './plugins';
import chatSessionRoutes from './routes/chat-session.routes';
import { env } from './env';

const app = Fastify({
  logger: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }
});

registerPlugins(app);

// Register routes
app.get('/', (req, res) => {
  res.redirect('/health');
});
app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

app.register(authRoutes, { prefix: '/auth' });
app.register(userRoutes, { prefix: '/user' });
app.register(chatRoutes, { prefix: '/chat' });
app.register(chatSessionRoutes, { prefix: '/session' });
app.register(weatherRoutes, { prefix: '/weather' });
app.register(locationRoutes, { prefix: '/location' });

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${env.PORT}`);
    console.log(`Documentation is running on http://localhost:${env.PORT}/documentation`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();