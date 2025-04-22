import { Hono } from 'hono';
import { invoiceRoutes } from './invoice/routes-invoice';
import { cartRoutes } from './cart/routes-cart';
import { wishlistRoutes } from './wishlist/routes-wishlist';
import { uploadRoutes } from './upload/routes-upload';
import { authRoutes } from './auth/routes-auth';
import { checkoutRoutes } from './checkout/routes-checkout';
import { productRoutes } from './products/products-routes'; // Import product routes
import { connectDB } from './products/products-services';
import { setupInvoiceTable } from './invoice/services-invoice';
import { setupCartTable } from './cart/services-cart';
import { setupWishlistTable } from './wishlist/services-wishlist';
import { setupUsersTable } from './auth/services-auth';
import { setupOrdersTable } from './checkout/services-checkout'; 
import { adminProductRoutes } from './admin/routes-admin';
import { tagRoutes } from './tag/routes-tag';
import { initCronJobs } from './cran-jobs';
import axios from 'axios';

// Request interceptor for adding auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const appRouter = new Hono();

// Connect to DB (Ensures tables exist)
connectDB();
setupInvoiceTable();
setupCartTable();
setupWishlistTable();
setupUsersTable();
setupOrdersTable();
// initCronJobs();

// Use Routes
appRouter.route('/', uploadRoutes);
appRouter.route('/', productRoutes); // Mount product routes at root
appRouter.route('/order', invoiceRoutes);
appRouter.route('/cart', cartRoutes);
appRouter.route('/wishlist', wishlistRoutes);
appRouter.route('/auth', authRoutes);
appRouter.route('/payment', checkoutRoutes);
appRouter.route('/admin', adminProductRoutes)
appRouter.route('/admin-tags', tagRoutes)

export default appRouter;