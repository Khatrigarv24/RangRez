import { Context } from 'hono';
import { getLowStockProducts } from '../products/products-services';

/**
 * Get products with low stock
 */
export const getLowStockInventory = async (c: Context) => {
  try {
    // Get threshold from query parameter or use default (10)
    const threshold = parseInt(c.req.query('threshold') || '10');
    
    // Get low stock products
    const lowStockProducts = await getLowStockProducts(threshold);
    
    // Prepare response with additional information
    return c.json({
      success: true,
      lowStockProducts,
      count: lowStockProducts.length,
      threshold,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching low stock products:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch low stock products',
      details: error.message
    }, 500);
  }
};