import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();
// Create DynamoDB Client
const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      sessionToken: process.env.AWS_SESSION_TOKEN as string,
    },
  });

const ddbDocClient = DynamoDBDocumentClient.from(dbClient);

// Define table name as a constant
const PRODUCTS_TABLE = 'products';

// Function to Ensure Table Exists
export async function connectDB(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await dbClient.send(new ListTablesCommand({}));
    if (listTables.TableNames?.includes(PRODUCTS_TABLE)) {
      console.log(`✅ Products table '${PRODUCTS_TABLE}' exists`);
      return;
    }

    console.log(`Creating products table '${PRODUCTS_TABLE}'...`);
    
    // Create the products table
    await dbClient.send(
      new CreateTableCommand({
        TableName: PRODUCTS_TABLE,
        KeySchema: [
          { AttributeName: 'productId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'productId', AttributeType: 'S' },
          { AttributeName: 'category', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'CategoryIndex',
            KeySchema: [
              { AttributeName: 'category', KeyType: 'HASH' }
            ],
            Projection: {
              ProjectionType: 'ALL'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits:1
            }
          },
          {
            IndexName: 'CreatedAtIndex',
            KeySchema: [
              { AttributeName: 'createdAt', KeyType: 'HASH' }
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
    
    console.log(`✅ Created products table '${PRODUCTS_TABLE}'`);
  } catch (err) {
    console.error("❌ Error ensuring DynamoDB table:", err);
    throw err;
  }
}

/**
 * Get low stock products (those with stock < threshold)
 */
export async function getLowStockProducts(threshold: number = 10): Promise<Array<{
  productId: string;
  name: string;
  stock: number;
  imageUrl?: string;
}>> {
  try {
    // Scan the products table with a filter for low stock
    const scanParams = {
      TableName: PRODUCTS_TABLE,
      FilterExpression: 'stock < :threshold',
      ExpressionAttributeValues: {
        ':threshold': threshold
      }
    };
    
    const result = await ddbDocClient.send(new ScanCommand(scanParams));
    const lowStockItems = result.Items || [];
    
    // Return only necessary fields
    return lowStockItems.map(item => ({
      productId: item.productId || item.id,
      name: item.name || 'Unknown Product',
      stock: item.stock || 0,
      imageUrl: item.imageUrl || item.imageUrls?.[0] || ''
    })).sort((a, b) => a.stock - b.stock); // Sort by stock (ascending)
  } catch (error) {
    console.error("❌ Error getting low stock products:", error);
    throw error;
  }
}

export { ddbDocClient };
