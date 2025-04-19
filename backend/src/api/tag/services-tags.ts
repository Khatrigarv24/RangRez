import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { ddbDocClient } from '../products/products-services';

dotenv.config();

// Define the tags table name
const TAGS_TABLE = 'product-tags';

// Ensure tags table exists
export async function setupTagsTable(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await ddbDocClient.send(new ListTablesCommand({}));
    
    if (listTables.TableNames?.includes(TAGS_TABLE)) {
      console.log(`✅ Tags table '${TAGS_TABLE}' exists`);
      return;
    }

    console.log(`Creating tags table '${TAGS_TABLE}'...`);
    
    // Create the tags table
    await ddbDocClient.send(
      new CreateTableCommand({
        TableName: TAGS_TABLE,
        KeySchema: [
          { AttributeName: 'tagId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'tagId', AttributeType: 'S' },
          { AttributeName: 'name', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'NameIndex',
            KeySchema: [
              { AttributeName: 'name', KeyType: 'HASH' }
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
        }
      })
    );
    
    console.log(`✅ Created tags table '${TAGS_TABLE}'`);
  } catch (err) {
    console.error(`❌ Error ensuring tags table:`, err);
  }
}

// Interface for tag
export interface Tag {
  tagId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// Create a new tag
export async function createTag(name: string, description: string, adminId: string): Promise<Tag> {
  // Check if tag name already exists
  const existingTag = await getTagByName(name);
  if (existingTag) {
    throw new Error(`Tag with name '${name}' already exists`);
  }
  
  const tagId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const tag: Tag = {
    tagId,
    name: name.toLowerCase().trim(),
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: adminId
  };
  
  await ddbDocClient.send(
    new PutCommand({
      TableName: TAGS_TABLE,
      Item: tag
    })
  );
  
  return tag;
}

// Get all tags
export async function getAllTags(): Promise<Tag[]> {
  const result = await ddbDocClient.send(
    new ScanCommand({
      TableName: TAGS_TABLE
    })
  );
  
  return (result.Items || []) as Tag[];
}

// Get tag by ID
export async function getTagById(tagId: string): Promise<Tag | null> {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TAGS_TABLE,
      Key: { tagId }
    })
  );
  
  return result.Item as Tag || null;
}

// Get tag by name
export async function getTagByName(name: string): Promise<Tag | null> {
  const result = await ddbDocClient.send(
    new ScanCommand({
      TableName: TAGS_TABLE,
      FilterExpression: 'name = :name',
      ExpressionAttributeValues: {
        ':name': name.toLowerCase().trim()
      }
    })
  );
  
  if (result.Items && result.Items.length > 0) {
    return result.Items[0] as Tag;
  }
  
  return null;
}

// Delete tag
export async function deleteTag(tagId: string): Promise<void> {
  await ddbDocClient.send(
    new DeleteCommand({
      TableName: TAGS_TABLE,
      Key: { tagId }
    })
  );
}

export { ddbDocClient };