import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
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
    if (listTables.TableNames?.includes('discts')) {
      console.log("✅ table exists");
      return;
    }

    console.log("Table does not exist....");
  } catch (err) {
    console.error("❌ Error ensuring DynamoDB table:", err);
  }
}

export { ddbDocClient };
