import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/rangrez', // Update with your API base URL
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Products
export const getProducts = (params) => api.get('/products', { params });
export const getProductById = (id) => api.get(`/products/${id}`);

// Admin Products
export const getAllProductsAdmin = () => api.get('/admin/products');
export const createProduct = (productData) => api.post('/admin/create', productData);
export const updateProduct = (id, productData) => api.put(`/admin/update/${id}`, productData);
export const deleteProduct = (id) => api.delete(`/admin/delete/${id}`, {
  headers: {
    'x-csrf-disable': 'true'
  }
});

// Orders
export const getOrdersByUser = (userId) => api.get(`/payment/orders/${userId}`);
export const getOrderById = (orderId) => api.get(`/payment/api/orders/${orderId}`);
export const createOrder = (orderData) => api.post('/payment/api/checkout', orderData);

// Admin Orders
export const getAllOrdersAdmin = (params) => api.get('/admin/orders', { params });
export const getOrderByIdAdmin = (orderId) => api.get(`/admin/orders/${orderId}`);
export const updateOrderStatus = (orderId, statusData) => api.patch(`/admin/orders/update/${orderId}`, statusData);

// Invoices
export const getInvoicesByUser = (userId) => api.get(`/order/invoice/${userId}`);
export const getInvoiceById = (invoiceId) => api.get(`/order/invoice/${invoiceId}`);
// Add the missing generateInvoice function
export const generateInvoice = (orderId) => api.get(`/order/${orderId}/invoice`);

// Admin Users
export const getAllUsersAdmin = (params) => api.get('/admin/users', { params });
export const updateUserAdmin = (userId, userData) => api.patch(`/admin/users/${userId}`, userData);

// Admin Analytics
export const getDashboardAnalytics = () => api.get('/admin/analytics');
export const getLowStockInventory = () => api.get('/admin/low-stock');

// Upload
export const uploadImage = (formData) => api.post('/upload', formData);

// Tags
export const getAllTags = () => api.get('/admin-tags/tags');
export const addTag = (tagData) => api.post('/admin-tags/add-tag', tagData);
export const removeTag = (tagId) => api.delete(`/admin-tags/tags/${tagId}`);

// Cart
export const getCartItems = (userId) => api.get(`/cart/${userId}`);
export const clearCart = (userId) => api.delete(`/cart/${userId}`, {
  headers: {
    'x-csrf-disable': 'true'
  }
});

export default api;