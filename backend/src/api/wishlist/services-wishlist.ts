import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

// Define the wishlist table name
const WISHLIST_TABLE = 'wishlist-items';

// Ensure wishlist table exists
export async function setupWishlistTable(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await dbClient.send(new ListTablesCommand({}));
    
    if (listTables.TableNames?.includes(WISHLIST_TABLE)) {
      console.log(`✅ Wishlist table '${WISHLIST_TABLE}' exists`);
      return;
    }

    console.log(`Creating wishlist table '${WISHLIST_TABLE}'...`);
    
    // Create the wishlist table
    await dbClient.send(
      new CreateTableCommand({
        TableName: WISHLIST_TABLE,
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
    
    console.log(`✅ Created wishlist table '${WISHLIST_TABLE}'`);
  } catch (err) {
    console.error(`❌ Error ensuring wishlist table:`, err);
  }
}

// Define wishlist item interface
export interface WishlistItem {
  userId: string;
  productId: string;
  addedAt: string;
  productDetails?: any; // Optional field for joined product data
}

// Check if an item exists in the wishlist
export async function isItemInWishlist(userId: string, productId: string): Promise<boolean> {
  try {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: WISHLIST_TABLE,
        KeyConditionExpression: 'userId = :userId AND productId = :productId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':productId': productId
        }
      })
    );
    
    return !!(result.Items && result.Items.length > 0);
  } catch (error) {
    console.error("❌ Error checking wishlist item:", error);
    return false;
  }
}

// Add item to wishlist
export async function addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
  const wishlistItem: WishlistItem = {
    userId,
    productId,
    addedAt: new Date().toISOString()
  };

  await ddbDocClient.send(
    new PutCommand({
      TableName: WISHLIST_TABLE,
      Item: wishlistItem
    })
  );

  return wishlistItem;
}

// Remove item from wishlist
export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await ddbDocClient.send(
    new DeleteCommand({
      TableName: WISHLIST_TABLE,
      Key: {
        userId,
        productId
      }
    })
  );
}

// Get all wishlist items for a user
export async function getWishlistItems(userId: string): Promise<WishlistItem[]> {
  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: WISHLIST_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
  );

  return result.Items as WishlistItem[];
}

export { ddbDocClient };