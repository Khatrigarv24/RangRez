import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { ddbDocClient } from '../products/products-services';
import { getCartItems, clearCart } from '../cart/services-cart';

dotenv.config();

// Define the orders table name
const ORDERS_TABLE = 'orders';

// Ensure orders table exists
export async function setupOrdersTable(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await ddbDocClient.send(new ListTablesCommand({}));
    
    if (listTables.TableNames?.includes(ORDERS_TABLE)) {
      console.log(`✅ Orders table '${ORDERS_TABLE}' exists`);
      return;
    }

    console.log(`Creating orders table '${ORDERS_TABLE}'...`);
    
    // Create the orders table
    await ddbDocClient.send(
      new CreateTableCommand({
        TableName: ORDERS_TABLE,
        KeySchema: [
          { AttributeName: 'orderId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'orderId', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'UserIdIndex',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' }
            ],
            Projection: {
              ProjectionType: 'ALL'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    
    console.log(`✅ Created orders table '${ORDERS_TABLE}'`);
  } catch (err) {
    console.error(`❌ Error ensuring orders table:`, err);
  }
}

// Define order interface
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

export interface Order {
  orderId: string;
  userId: string;
  products: OrderItem[];
  subtotal: number;
  gst: number;
  total: number;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Validate cart and calculate totals
export async function validateAndCalculateCart(userId: string): Promise<{
  cartItems: OrderItem[];
  subtotal: number;
  gst: number;
  total: number;
  isValid: boolean;
  error?: string;
}> {
  try {
    // Get cart items for the user
    const cartItems = await getCartItems(userId);
    
    if (!cartItems || cartItems.length === 0) {
      return {
        cartItems: [],
        subtotal: 0,
        gst: 0,
        total: 0,
        isValid: false,
        error: "Cart is empty"
      };
    }
    
    // Validate each item and collect product details
    const validatedItems: OrderItem[] = [];
    let invalidItems: string[] = [];
    let subtotal = 0;
    
    for (const item of cartItems) {
      try {
        // Get product details to verify availability and price
        const productResult = await ddbDocClient.send(
          new GetCommand({
            TableName: 'discts', // Using the existing products table
            Key: { productId: item.productId }
          })
        );
        
        const product = productResult.Item;
        
        if (!product) {
          invalidItems.push(`Product ${item.productId} not found`);
          continue;
        }
        
        // Check if there's enough stock
        if (product.stock < item.quantity) {
          invalidItems.push(`Not enough stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
          continue;
        }
        
        // Calculate item subtotal
        const price = product.price;
        const itemSubtotal = price * item.quantity;
        subtotal += itemSubtotal;
        
        // Add validated item to our list
        validatedItems.push({
          productId: item.productId,
          name: product.name,
          price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          imageUrl: product.imageUrl
        });
      } catch (error) {
        console.error(`❌ Error validating product ${item.productId}:`, error);
        invalidItems.push(`Error validating product ${item.productId}`);
      }
    }
    
    // If there are invalid items, return error
    if (invalidItems.length > 0) {
      return {
        cartItems: [],
        subtotal: 0,
        gst: 0,
        total: 0,
        isValid: false,
        error: `Invalid items in cart: ${invalidItems.join(', ')}`
      };
    }
    
    // Calculate GST (18%)
    const gst = parseFloat((subtotal * 0.18).toFixed(2));
    
    // Calculate total
    const total = parseFloat((subtotal + gst).toFixed(2));
    
    return {
      cartItems: validatedItems,
      subtotal,
      gst,
      total,
      isValid: true
    };
  } catch (error) {
    console.error("❌ Error validating cart:", error);
    return {
      cartItems: [],
      subtotal: 0,
      gst: 0,
      total: 0,
      isValid: false,
      error: "Failed to validate cart"
    };
  }
}

// Create a new order
export async function createOrder(
  userId: string,
  products: OrderItem[],
  subtotal: number,
  gst: number,
  total: number,
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }
): Promise<Order> {
  // Generate a unique order ID
  const orderId = `ORD-${uuidv4().substring(0, 8)}`;
  const timestamp = new Date().toISOString();
  
  // Create order object
  const order: Order = {
    orderId,
    userId,
    products,
    subtotal,
    gst,
    total,
    shippingAddress,
    paymentStatus: 'pending',
    createdAt: timestamp
  };
  
  // Save order to DynamoDB
  await ddbDocClient.send(
    new PutCommand({
      TableName: ORDERS_TABLE,
      Item: order
    })
  );
  
  return order;
}

// Update order stock (decrease product quantity)
export async function updateProductStock(products: OrderItem[]): Promise<void> {
  for (const product of products) {
    try {
      // Get current product stock
      const productResult = await ddbDocClient.send(
        new GetCommand({
          TableName: 'discts',
          Key: { productId: product.productId }
        })
      );
      
      const currentProduct = productResult.Item;
      
      if (currentProduct) {
        const newStock = Math.max(0, currentProduct.stock - product.quantity);
        
        // Update the stock
        await ddbDocClient.send({
          TableName: 'discts',
          Key: { productId: product.productId },
          UpdateExpression: 'set stock = :stock',
          ExpressionAttributeValues: {
            ':stock': newStock
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error updating stock for product ${product.productId}:`, error);
    }
  }
}

// Get order by ID
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId }
      })
    );
    
    return result.Item as Order || null;
  } catch (error) {
    console.error(`❌ Error fetching order ${orderId}:`, error);
    return null;
  }
}

// Get orders by user ID
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  try {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
    );
    
    return (result.Items || []) as Order[];
  } catch (error) {
    console.error(`❌ Error fetching orders for user ${userId}:`, error);
    return [];
  }
}

// Update order payment status
export async function updateOrderPaymentStatus(
  orderId: string, 
  paymentStatus: 'pending' | 'paid' | 'failed',
  paymentId?: string,
  paymentMethod?: string
): Promise<Order | null> {
  try {
    const timestamp = new Date().toISOString();
    
    const result = await ddbDocClient.send({
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: 'set paymentStatus = :status, updatedAt = :timestamp, paymentId = :paymentId, paymentMethod = :paymentMethod',
      ExpressionAttributeValues: {
        ':status': paymentStatus,
        ':timestamp': timestamp,
        ':paymentId': paymentId || null,
        ':paymentMethod': paymentMethod || null
      },
      ReturnValues: 'ALL_NEW'
    });
    
    return result.Attributes as Order || null;
  } catch (error) {
    console.error(`❌ Error updating payment status for order ${orderId}:`, error);
    return null;
  }
}

// Helper function to create a Razorpay order (to be implemented with actual Razorpay API)
export async function createRazorpayOrder(amount: number, orderId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  orderId: string;
}> {
  // This is a placeholder. In a real implementation, you would call Razorpay API
  // to create an actual payment order
  
  return {
    id: `rzp_${Date.now()}`,
    amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
    currency: 'INR',
    orderId
  };
}

export { ddbDocClient };