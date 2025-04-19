import { Context, Next } from 'hono';
import { verifyToken } from '../auth/services-auth';
import { getUserById } from '../auth/services-auth';

// Admin authentication middleware
export const isAdmin = async (c: Context, next: Next) => {
  try {
    // Get user from the authentication middleware
    const user = c.get('user');
    
    // Check if user has admin role
    if (!user.isAdmin && user.role !== 'admin') {
      return c.json({
        success: false,
        error: "Admin access required"
      }, 403);
    }
    
    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: "Admin authorization failed"
    }, 403);
  }
};