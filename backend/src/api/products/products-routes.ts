import { Hono } from 'hono';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from './products-controller';

const productRoutes = new Hono();

// Define Routes
productRoutes.get('/products', getProducts);
productRoutes.get('/products/:id', getProductById);
productRoutes.post('/products', createProduct);
productRoutes.put('/products/:id', updateProduct);
productRoutes.delete('/products/:id', deleteProduct);

export { productRoutes };
