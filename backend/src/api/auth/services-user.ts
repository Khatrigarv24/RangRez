import { Context, Next } from 'hono';
import { verifyToken } from './services-auth';

// JWT authentication middleware
export const authenticate = async (c: Context, next: Next) => {
  // Get token from Authorization header
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: "Authentication required"
    }, 401);
  }
  
  // Extract the token
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const user = verifyToken(token);
  
  if (!user) {
    return c.json({
      success: false,
      error: "Invalid or expired token"
    }, 401);
  }
  
  // Set user in context variables for route handlers
  c.set('user', user);
  
  await next();
};

// Authorization middleware for user's own resources
export const authorizeOwnership = async (c: Context, next: Next) => {
  const user = c.get('user');
  const requestedUserId = c.req.param('userId');
  
  // User can only access their own resources
  if (user.userId !== requestedUserId) {
    return c.json({
      success: false,
      error: "You don't have permission to access this resource"
    }, 403);
  }
  
  await next();
};