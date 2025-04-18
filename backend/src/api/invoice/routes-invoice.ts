import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateOrderInvoice } from './order-invoice-controller';

const orderRoutes = new Hono();

// Enable CORS
orderRoutes.use('*', cors());

// Invoice routes
orderRoutes.get('/:orderId/invoice', generateOrderInvoice);

export { orderRoutes };