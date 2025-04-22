import { Context } from 'hono';
import { 
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from './products-services';

// Use the shared ddbDocClient from products-services
const tableName = 'products';

/**
 * Get products with filtering and sorting capabilities (public user access)
 * Supports filters: color, fabric, minPrice, maxPrice
 * Supports sorting: price_asc, price_desc, createdAt_desc, etc.
 */
export const getProducts = async (c: Context) => {
  try {
    // Extract query parameters
    const color = c.req.query('color');
    const fabric = c.req.query('fabric');
    const minPrice = c.req.query('minPrice') ? parseFloat(c.req.query('minPrice')) : undefined;
    const maxPrice = c.req.query('maxPrice') ? parseFloat(c.req.query('maxPrice')) : undefined;
    const sort = c.req.query('sort') || 'createdAt_desc'; // Default sorting

    // Build filter expressions for DynamoDB scan
    let filterExpressions = [];
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};
    
    // Add color filter if provided
    if (color) {
      filterExpressions.push('contains(#color, :color)');
      expressionAttributeNames['#color'] = 'color';
      expressionAttributeValues[':color'] = color;
    }
    
    // Add fabric filter if provided
    if (fabric) {
      filterExpressions.push('contains(#fabric, :fabric)');
      expressionAttributeNames['#fabric'] = 'fabric';
      expressionAttributeValues[':fabric'] = fabric;
    }
    
    // Add price range filters if provided
    if (minPrice !== undefined) {
      filterExpressions.push('#price >= :minPrice');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':minPrice'] = minPrice;
    }
    
    if (maxPrice !== undefined) {
      filterExpressions.push('#price <= :maxPrice');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':maxPrice'] = maxPrice;
    }
    
    // Combine filter expressions if any
    const filterExpression = filterExpressions.length > 0 
      ? filterExpressions.join(' AND ')
      : undefined;
    
    // Execute DynamoDB scan with filters
    const scanParams: any = {
      TableName: tableName
    };
    
    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const { Items } = await ddbDocClient.send(new ScanCommand(scanParams));
    
    if (!Items || Items.length === 0) {
      return c.json({ 
        success: true, 
        products: [] 
      });
    }
    
    // Format response with expected fields - only expose public fields
    const products = Items.map(item => ({
      id: item.id || item.productId || '',
      name: item.name || '',
      fabric: item.fabric || '',
      color: item.color || '',
      price: item.price || 0,
      stock: item.stock || 0,
      imageUrl: item.imageUrl || item.imageUrls?.[0] || '',
      imageUrls: item.imageUrls || [],
      tags: item.tags || [],
      description: item.description || '',
      createdAt: item.createdAt || new Date().toISOString()
    }));
    
    // Apply sorting
    const [sortField, sortDirection] = sort.split('_');
    
    products.sort((a: any, b: any) => {
      if (sortField === 'price') {
        return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
      } else if (sortField === 'createdAt') {
        return sortDirection === 'asc' ? 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Default sort by name if unspecified field
      return sortDirection === 'asc' ? 
        a.name.localeCompare(b.name) : 
        b.name.localeCompare(a.name);
    });
    
    return c.json({ 
      success: true, 
      products,
      count: products.length
    });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return c.json({ 
      success: false, 
      error: "Error retrieving products", 
      details: error.message 
    }, 500);
  }
};

/**
 * Get a single product by ID (public user access)
 */
export const getProductById = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    
    const params = {
      TableName: tableName,  // Make sure tableName is 'products'
      Key: { productId: productId }  // Changed from 'id' to 'productId'
    };
    
    const { Item } = await ddbDocClient.send(new GetCommand(params));
    
    if (!Item) {
      return c.json({ 
        success: false, 
        error: "Product not found" 
      }, 404);
    }
    
    // Format response with public fields only
    return c.json({
      success: true,
      product: {
        id: Item.id || Item.productId,
        name: Item.name || '',
        description: Item.description || '',
        fabric: Item.fabric || '',
        color: Item.color || '',
        price: Item.price || 0,
        stock: Item.stock || 0,
        imageUrl: Item.imageUrl || Item.imageUrls?.[0] || '',
        imageUrls: Item.imageUrls || [],
        tags: Item.tags || [],
        createdAt: Item.createdAt || '',
        featured: Item.featured || false,
        discount: Item.discount || 0
      }
    });
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    return c.json({ 
      success: false, 
      error: "Error retrieving product", 
      details: error.message 
    }, 500);
  }
};