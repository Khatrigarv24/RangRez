import { Context } from 'hono';
import { 
  DynamoDBClient, 
  DynamoDBClientConfig 
} from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  DeleteCommand, 
  UpdateCommand,
  ScanCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// AWS Configuration
const config: DynamoDBClientConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

const client = new DynamoDBClient(config);
const ddbDocClient = DynamoDBDocumentClient.from(client);
const tableName = 'products';

/**
 * Get products with filtering and sorting capabilities
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

    console.log(`Fetching products with filters - color: ${color}, fabric: ${fabric}, price range: ${minPrice}-${maxPrice}, sort: ${sort}`);
    
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
    
    // Format response with expected fields
    const products = Items.map(item => ({
      id: item.id || item.productId || '',
      name: item.name || '',
      fabric: item.fabric || '',
      color: item.color || '',
      price: item.price || 0,
      stock: item.stock || 0,
      imageUrl: item.imageUrl || '',
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
      products
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
 * Get a single product by ID
 */
export const getProductById = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    
    const params = {
      TableName: tableName,
      Key: { id: productId }
    };
    
    const { Item } = await ddbDocClient.send(new GetCommand(params));
    
    if (!Item) {
      return c.json({ 
        success: false, 
        error: "Product not found" 
      }, 404);
    }
    
    return c.json({
      success: true,
      product: {
        id: Item.id || Item.productId,
        name: Item.name || '',
        fabric: Item.fabric || '',
        color: Item.color || '',
        price: Item.price || 0,
        stock: Item.stock || 0,
        imageUrl: Item.imageUrl || '',
        createdAt: Item.createdAt || ''
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

/**
 * Create a new product
 */
export const createProduct = async (c: Context) => {
  try {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.name || !body.price) {
      return c.json({ 
        success: false, 
        error: "Missing required fields: name and price are required" 
      }, 400);
    }
    
    const productId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const product = {
      id: productId,
      name: body.name,
      fabric: body.fabric || '',
      color: body.color || '',
      price: parseFloat(body.price),
      stock: body.stock || 0,
      imageUrl: body.imageUrl || '',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await ddbDocClient.send(new PutCommand({
      TableName: tableName,
      Item: product
    }));
    
    return c.json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);
    return c.json({ 
      success: false, 
      error: "Error creating product", 
      details: error.message 
    }, 500);
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    
    // Build update expression dynamically based on provided fields
    let updateExpression = "set updatedAt = :updatedAt";
    const expressionAttributeValues: any = {
      ":updatedAt": new Date().toISOString()
    };
    
    // Add fields to update expression if they exist in the request
    if (body.name) {
      updateExpression += ", #name = :name";
      expressionAttributeValues[":name"] = body.name;
    }
    
    if (body.fabric !== undefined) {
      updateExpression += ", fabric = :fabric";
      expressionAttributeValues[":fabric"] = body.fabric;
    }
    
    if (body.color !== undefined) {
      updateExpression += ", color = :color";
      expressionAttributeValues[":color"] = body.color;
    }
    
    if (body.price !== undefined) {
      updateExpression += ", price = :price";
      expressionAttributeValues[":price"] = parseFloat(body.price);
    }
    
    if (body.stock !== undefined) {
      updateExpression += ", stock = :stock";
      expressionAttributeValues[":stock"] = body.stock;
    }
    
    if (body.imageUrl !== undefined) {
      updateExpression += ", imageUrl = :imageUrl";
      expressionAttributeValues[":imageUrl"] = body.imageUrl;
    }
    
    const params = {
      TableName: tableName,
      Key: { id: productId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: body.name ? { "#name": "name" } : undefined,
      ReturnValues: "ALL_NEW" as const // Fix the type issue by using 'as const'
    };
    
    const { Attributes } = await ddbDocClient.send(new UpdateCommand(params));
    
    if (!Attributes) {
      return c.json({ 
        success: false, 
        error: "Product not found" 
      }, 404);
    }
    
    return c.json({
      success: true,
      message: "Product updated successfully",
      product: Attributes
    });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    return c.json({ 
      success: false, 
      error: "Error updating product", 
      details: error.message 
    }, 500);
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    
    const params = {
      TableName: tableName,
      Key: { id: productId }
    };
    
    await ddbDocClient.send(new DeleteCommand(params));
    
    return c.json({
      success: true,
      message: "Product deleted successfully",
      id: productId
    });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    return c.json({ 
      success: false, 
      error: "Error deleting product", 
      details: error.message 
    }, 500);
  }
};