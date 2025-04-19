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

// Function to Ensure Table Exists
export async function connectDB(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await dbClient.send(new ListTablesCommand({}));
    if (listTables.TableNames?.includes('products')) {
      console.log("✅ table exists");
      return;
    }

    console.log("Table does not exist....");
  } catch (err) {
    console.error("❌ Error ensuring DynamoDB table:", err);
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
      TableName: 'products',
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
