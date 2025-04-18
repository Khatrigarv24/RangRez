import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  toggleWishlistItem,
  getUserWishlist,
  removeWishlistItem
} from './controller-wishlist';

const wishlistRoutes = new Hono();

// Enable CORS
wishlistRoutes.use('*', cors());

// Define Wishlist Routes
wishlistRoutes.post('/api/wishlist', toggleWishlistItem);                   // Toggle item in wishlist
wishlistRoutes.get('/api/wishlist/:userId', getUserWishlist);               // Get user's wishlist
wishlistRoutes.delete('/api/wishlist/:userId/:productId', removeWishlistItem);  // Remove item from wishlist

export { wishlistRoutes };