import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  addItemToCart,
  getUserCart,
  removeItemFromCart,
  clearUserCart
} from './controller-cart';

const cartRoutes = new Hono();

// Enable CORS
cartRoutes.use('*', cors());

// Define Cart Routes
cartRoutes.post('/cart', addItemToCart);               // Add/update item in cart
cartRoutes.get('/cart/:userId', getUserCart);          // Get user's cart
cartRoutes.delete('/cart/:userId/:productId', removeItemFromCart);  // Remove item from cart
cartRoutes.delete('/cart/:userId', clearUserCart);     // Clear user's entire cart   // Get cart item count

export { cartRoutes };