import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { 
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../admin/controller-admin';
import {
  getAllUsers,
  updateUser,
  getUserById
} from '../admin/controller-users';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus
} from '../admin/controller-orders';
import {
  getDashboardAnalytics
} from '../admin/controller-analytics';
import {
  getLowStockInventory
} from '../admin/controller-inventory';
import { authenticate } from './../auth/services-user';
import { isAdmin } from './../admin/services-admin';

const adminProductRoutes = new Hono();

// Enable CORS
adminProductRoutes.use('*', cors());

// Admin-only routes - all require authentication and admin privileges
// Product management
adminProductRoutes.get('/products', authenticate, isAdmin, getAllProducts);
adminProductRoutes.get('/products/:id', authenticate, isAdmin, getProductById);
adminProductRoutes.post('/create', authenticate, isAdmin, createProduct);
adminProductRoutes.put('/update/:id', authenticate, isAdmin, updateProduct);
adminProductRoutes.delete('/delete/:id', authenticate, isAdmin, deleteProduct);

// User management routes
adminProductRoutes.get('/users', authenticate, isAdmin, getAllUsers);
adminProductRoutes.get('/users/:userId', authenticate, isAdmin, getUserById);
adminProductRoutes.patch('/users/:userId', authenticate, isAdmin, updateUser);

// Order management routes
adminProductRoutes.get('/orders', authenticate, isAdmin, getAllOrders);
adminProductRoutes.get('/orders/:orderId', authenticate, isAdmin, getOrderById);
adminProductRoutes.patch('/orders/update/:orderId', authenticate, isAdmin, updateOrderStatus);

// Analytics routes
adminProductRoutes.get('/analytics', authenticate, isAdmin, getDashboardAnalytics);

// Inventory management routes
adminProductRoutes.get('/low-stock', authenticate, isAdmin, getLowStockInventory);

export { adminProductRoutes };