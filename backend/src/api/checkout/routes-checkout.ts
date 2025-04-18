import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { processCheckout } from './controller-checkout';

const checkoutRoutes = new Hono();

// Enable CORS
checkoutRoutes.use('*', cors());

// Define Checkout Routes
checkoutRoutes.post('/api/checkout', processCheckout);

export { checkoutRoutes };