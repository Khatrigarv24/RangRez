import { Context } from 'hono';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  DeleteCommand, 
  UpdateCommand,
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ddbDocClient } from './../products/products-services';

// Define the products table name 
const tableName = 'products';

/**
 * Get all products (admin view with all details)
 */
export const getAllProducts = async (c: Context) => {
  try {
    const scanParams = {
      TableName: "products"
    };
    
    const { Items } = await ddbDocClient.send(new ScanCommand(scanParams));
    
    return c.json({
      success: true,
      products: Items || [],
      count: Items?.length || 0
    });
  } catch (error) {
    console.error("❌ Error fetching all products:", error);
    return c.json({ 
      success: false, 
      error: "Error retrieving products", 
      details: error.message 
    }, 500);
  }
};

/**
 * Get a single product by ID (admin view with all details)
 */
export const getProductById = async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const params = {
      TableName: "products",
      Key: { productId: id }
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
      product: Item
    });
  } catch (error) {
    console.error("❌ Error fetching product by ID:", error);
    return c.json({ 
      success: false, 
      error: "Error retrieving product", 
      details: error.message 
    }, 500);
  }
};

/**
 * Add a new product (admin only)
 */
export const createProduct = async (c: Context) => {
  try {
    const body = await c.req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'fabric', 'color', 'tags', 'stock', 'imageUrls'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return c.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, 400);
    }
    
    // Validate price (must be positive number)
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      return c.json({ 
        success: false, 
        error: "Price must be a positive number" 
      }, 400);
    }
    
    // Validate stock (must be positive integer)
    const stock = parseInt(body.stock);
    if (isNaN(stock) || stock < 0) {
      return c.json({ 
        success: false, 
        error: "Stock must be a non-negative integer" 
      }, 400);
    }
    
    // Generate unique product ID
    const productId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Get admin info from context
    const admin = c.get('user');
    
    // Create product object
    const product = {
      id: productId,
      productId, // Adding for compatibility
      name: body.name,
      description: body.description,
      price,
      fabric: body.fabric,
      color: body.color,
      tags: body.tags,
      stock,
      imageUrls: body.imageUrls,
      imageUrl: body.imageUrls[0], // Keep for legacy support
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: admin?.userId || 'system',
      featured: body.featured || false,
      discount: body.discount || 0
    };
    
    // Save to DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: "products",
        Item: product
      })
    );
    
    return c.json({
      success: true,
      message: "Product added successfully",
      product
    }, 201);
  } catch (error) {
    console.error("❌ Error adding product:", error);
    return c.json({ 
      success: false, 
      error: "Error adding product", 
      details: error.message 
    }, 500);
  }
};

/**
 * Update an existing product (admin only)
 */
export const updateProduct = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    
    // Get current product to ensure it exists
    const getParams = {
      TableName: "products",
      Key: { id: productId }
    };
    
    const { Item } = await ddbDocClient.send(new GetCommand(getParams));
    
    if (!Item) {
      return c.json({ 
        success: false, 
        error: "Product not found" 
      }, 404);
    }
    
    // Validate price if provided
    if (body.price !== undefined) {
      const price = parseFloat(body.price);
      if (isNaN(price) || price <= 0) {
        return c.json({ 
          success: false, 
          error: "Price must be a positive number" 
        }, 400);
      }
      body.price = price;
    }
    
    // Validate stock if provided
    if (body.stock !== undefined) {
      const stock = parseInt(body.stock);
      if (isNaN(stock) || stock < 0) {
        return c.json({ 
          success: false, 
          error: "Stock must be a non-negative integer" 
        }, 400);
      }
      body.stock = stock;
    }
    
    // Get admin info from context
    const admin = c.get('user');
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Add updatedAt and updatedBy
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    updateExpressions.push('#updatedBy = :updatedBy');
    expressionAttributeNames['#updatedBy'] = 'updatedBy';
    expressionAttributeValues[':updatedBy'] = admin?.userId || 'system';
    
    // Add other fields if they're provided
    const fieldsToUpdate = [
      'name', 'description', 'price', 'fabric', 'color', 
      'tags', 'stock', 'imageUrls', 'featured', 'discount'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
        
        // Update imageUrl if imageUrls is being updated
        if (field === 'imageUrls' && Array.isArray(body[field]) && body[field].length > 0) {
          updateExpressions.push(`imageUrl = :imageUrl`);
          expressionAttributeValues[`:imageUrl`] = body[field][0];
        }
      }
    });
    
    // Execute update
    const updateParams = {
      TableName: "products",
      Key: { id: productId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW' as const
    };
    
    const { Attributes } = await ddbDocClient.send(new UpdateCommand(updateParams));
    
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
 * Delete a product (admin only)
 */
export const deleteProduct = async (c: Context) => {
  try {
    const productId = c.req.param('id');
    
    // Check if product exists
    const getParams = {
      TableName: "products",
      Key: { id: productId }
    };
    
    const { Item } = await ddbDocClient.send(new GetCommand(getParams));
    
    if (!Item) {
      return c.json({ 
        success: false, 
        error: "Product not found" 
      }, 404);
    }
    
    // Delete the product
    const deleteParams = {
      TableName: "products",
      Key: { id: productId }
    };
    
    await ddbDocClient.send(new DeleteCommand(deleteParams));
    
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