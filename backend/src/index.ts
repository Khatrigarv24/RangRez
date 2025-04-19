import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { BootstrapServer } from './utils/bootstrap';
import { initCronJobs } from './api/cron-jobs';

const app = new Hono();

// Bootstrap server (load routes, middlewares, etc.)
async function bootstrap() {
  await BootstrapServer(app);
  
  // Initialize scheduled jobs
  initCronJobs();
  
  // Start server
  const port = process.env.PORT || 5000;
  console.log(`Server running on port ${port}`);
  serve({ fetch: app.fetch, port: Number(port) });
}

bootstrap().catch((error) => {
  console.error('❌ Error bootstrapping server:', error);
  process.exit(1);
});
