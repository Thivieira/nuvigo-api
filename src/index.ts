import { serve } from '@hono/node-server'
import { Hono } from 'hono';
import { weatherRoutes } from './routes/weather.routes';

export const app = new Hono();

app.route('/weather', weatherRoutes);

serve(app, (info) => {
  console.log(info)
  console.log(`Server is running on http://localhost:${info.port}`)
})