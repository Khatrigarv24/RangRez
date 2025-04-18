import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

// Reuse the existing DynamoDB client configuration
const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    sessionToken: process.env.AWS_SESSION_TOKEN as string,
  },
});

const ddbDocClient = DynamoDBDocumentClient.from(dbClient);

// Define the cart table name
const CART_TABLE = 'cart-items';

// Ensure cart table exists
export async function setupCartTable(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await dbClient.send(new ListTablesCommand({}));
    
    if (listTables.TableNames?.includes(CART_TABLE)) {
      console.log(`✅ Cart table '${CART_TABLE}' exists`);
      return;
    }

    console.log(`Creating cart table '${CART_TABLE}'...`);
    
    // Create the cart table
    await dbClient.send(
      new CreateTableCommand({
        TableName: CART_TABLE,
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'productId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'productId', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    
    console.log(`✅ Created cart table '${CART_TABLE}'`);
  } catch (err) {
    console.error(`❌ Error ensuring cart table:`, err);
  }
}

// Define cart item interface
export interface CartItem {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
  productDetails?: any; // Optional field for joined product data
}

// Add or update item in cart
export async function addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  
  const cartItem: CartItem = {
    userId,
    productId,
    quantity,
    addedAt: new Date().toISOString()
  };

  await ddbDocClient.send(
    new PutCommand({
      TableName: CART_TABLE,
      Item: cartItem
    })
  );

  return cartItem;
}

// Get all cart items for a user
export async function getCartItems(userId: string): Promise<CartItem[]> {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: CART_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
  );

  return result.Items as CartItem[];
}

// Remove item from cart
export async function removeFromCart(userId: string, productId: string): Promise<void> {
  await ddbDocClient.send(
    new DeleteCommand({
      TableName: CART_TABLE,
      Key: {
        userId,
        productId
      }
    })
  );
}

// Clear user's entire cart
export async function clearCart(userId: string): Promise<void> {
  const cartItems = await getCartItems(userId);
  
  for (const item of cartItems) {
    await removeFromCart(userId, item.productId);
  }
}

// Get cart item count for a user
export async function getCartItemCount(userId: string): Promise<number> {
  const cartItems = await getCartItems(userId);
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}

export { ddbDocClient };