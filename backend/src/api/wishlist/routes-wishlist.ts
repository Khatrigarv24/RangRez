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
wishlistRoutes.post('/add', toggleWishlistItem);                   // Toggle item in wishlist
wishlistRoutes.get('/:userId', getUserWishlist);               // Get user's wishlist
wishlistRoutes.delete('/:userId/:productId', removeWishlistItem);  // Remove item from wishlist

export { wishlistRoutes };