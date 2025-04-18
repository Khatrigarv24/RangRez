import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { register, login } from './controller-auth';
import { getUserProfile, updateUserProfileHandler } from './controller-user-profile';
import { authenticate, authorizeOwnership } from './services-user';

const authRoutes = new Hono();

// Enable CORS
authRoutes.use('*', cors());

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);

// Protected routes
authRoutes.get('/user/:userId', authenticate, authorizeOwnership, getUserProfile);
authRoutes.put('/user/:userId', authenticate, authorizeOwnership, updateUserProfileHandler);

export { authRoutes };