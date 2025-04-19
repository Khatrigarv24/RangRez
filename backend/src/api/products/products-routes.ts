import { Hono } from 'hono';
import { 
  getProducts, 
  getProductById, 
} from './products-controller';

const productRoutes = new Hono();

// Define Routes
productRoutes.get('/products', getProducts);
productRoutes.get('/products/:id', getProductById);

export { productRoutes };
