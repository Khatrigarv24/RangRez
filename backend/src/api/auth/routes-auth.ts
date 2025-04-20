import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { register, login } from './controller-auth';
import { getUserProfile, updateUserProfileHandler } from './controller-user-profile';
import { authenticate, authorizeOwnership } from './services-user';
import { makeUserAdmin } from './controller-auth'; // Add this new import

const authRoutes = new Hono();

// Enable CORS
authRoutes.use('*', cors());

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);

// Protected routes
authRoutes.get('/user/:userId', authenticate, authorizeOwnership, getUserProfile);
authRoutes.put('/user/:userId', authenticate, authorizeOwnership, updateUserProfileHandler);

// Admin setup route (should be disabled in production or properly secured)
// Use a secret key in the query string for basic protection
authRoutes.post('/setup-admin/:userId', async (c) => {
  const secretKey = c.req.query('secretKey');
  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  
  if (!setupSecret || secretKey !== setupSecret) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }
  
  const userId = c.req.param('userId');
  return await makeUserAdmin(c, userId);
});

export { authRoutes };