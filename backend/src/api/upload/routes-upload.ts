import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { uploadImage } from './controller-upload';

const uploadRoutes = new Hono();

// Enable CORS
uploadRoutes.use('*', cors());

// Define Upload Routes
uploadRoutes.post('/upload', uploadImage);

export { uploadRoutes };