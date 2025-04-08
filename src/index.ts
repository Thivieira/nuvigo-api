import Fastify from 'fastify';
import weatherRoutes from './routes/weather.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import authRoutes from './routes/auth.routes';
import registerPlugins from './plugins';

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
app.register(weatherRoutes, { prefix: '/weather' });

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3333');
    console.log('Documentation is running on http://localhost:3333/documentation');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();