import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateOrderInvoice } from './controller-invoice';

const invoiceRoutes = new Hono();

// Enable CORS
invoiceRoutes.use('*', cors());

// Invoice routes
invoiceRoutes.get('/:orderId/invoice', generateOrderInvoice);

export { invoiceRoutes };