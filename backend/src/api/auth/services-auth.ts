import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

// Define the users table name
const USERS_TABLE = 'users';

// Define JWT secret (ideally from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// Ensure users table exists
export async function setupUsersTable(): Promise<void> {
  try {
    // Check if table already exists
    const listTables = await dbClient.send(new ListTablesCommand({}));
    
    if (listTables.TableNames?.includes(USERS_TABLE)) {
      console.log(`✅ Users table '${USERS_TABLE}' exists`);
      return;
    }

    console.log(`Creating users table '${USERS_TABLE}'...`);
    
    // Create the users table with additional fields
    await dbClient.send(
      new CreateTableCommand({
        TableName: USERS_TABLE,
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'email', AttributeType: 'S' },
          { AttributeName: 'mobile', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'EmailIndex',
            KeySchema: [
              { AttributeName: 'email', KeyType: 'HASH' }
            ],
            Projection: {
              ProjectionType: 'ALL'
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          },
          {
            IndexName: 'MobileIndex',
            KeySchema: [
              { AttributeName: 'mobile', KeyType: 'HASH' }
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
    
    console.log(`✅ Created users table '${USERS_TABLE}'`);
  } catch (err) {
    console.error(`❌ Error ensuring users table:`, err);
  }
}

// Interface for user details
export interface User {
  userId: string;
  name?: string;
  email: string;
  mobile: string;
  address?: string;
  gstNumber?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt?: string;
  isB2B?: boolean;    // New field
  isBlocked?: boolean; // New field
  notes?: string;      // New field for admin notes
  adminComments?: string; // New field
  lastLogin?: string;  // Track last login date
  orderCount?: number; // Track number of orders
  updatedBy?: string;  // Track who updated the record
}

// Check if user exists by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      })
    );
    
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as User;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Error finding user by email:", error);
    return null;
  }
}

// Check if user exists by mobile
export async function findUserByMobile(mobile: string): Promise<User | null> {
  try {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'MobileIndex',
        KeyConditionExpression: 'mobile = :mobile',
        ExpressionAttributeValues: {
          ':mobile': mobile
        }
      })
    );
    
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as User;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Error finding user by mobile:", error);
    return null;
  }
}

// Register a new user
export async function registerUser(
  email: string,
  mobile: string,
  password: string,
  gstNumber?: string
): Promise<User> {
  // Generate a unique user ID
  const userId = uuidv4();
  
  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user object
  const user: User = {
    userId,
    email: email.toLowerCase(),
    mobile,
    gstNumber,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  
  // Save user to DynamoDB
  await ddbDocClient.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: user
    })
  );
  
  return user;
}

// Validate user credentials and return JWT if valid
export async function loginUser(emailOrMobile: string, password: string): Promise<{token: string; user: Partial<User>} | null> {
  try {
    // Determine if input is email or mobile
    const isEmail = emailOrMobile.includes('@');
    
    // Find user by email or mobile
    const user = isEmail 
      ? await findUserByEmail(emailOrMobile.toLowerCase())
      : await findUserByMobile(emailOrMobile);
    
    if (!user) {
      return null;
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      throw new Error('Account is blocked. Please contact customer support.');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return null;
    }
    
    // Update last login time
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: user.userId },
          UpdateExpression: 'set lastLogin = :lastLogin',
          ExpressionAttributeValues: {
            ':lastLogin': new Date().toISOString()
          }
        })
      );
    } catch (updateError) {
      console.error('Error updating last login time:', updateError);
      // Continue even if updating last login fails
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.userId,
        email: user.email,
        mobile: user.mobile,
        isB2B: user.isB2B || false,
        isBlocked: user.isBlocked || false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return token and user details (excluding password hash)
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error("❌ Error during login:", error);
    throw error;
  }
}

// Get user by userId
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      })
    );
    
    return result.Item as User || null;
  } catch (error) {
    console.error("❌ Error finding user by ID:", error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    mobile?: string;
    address?: string;
    gstNumber?: string;
  }
): Promise<User | null> {
  try {
    // First check if user exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return null;
    }
    
    // If email is being updated, check if it already exists for another user
    if (updates.email && updates.email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const userWithEmail = await findUserByEmail(updates.email);
      if (userWithEmail && userWithEmail.userId !== userId) {
        throw new Error("Email already in use by another account");
      }
    }
    
    // If mobile is being updated, check if it already exists for another user
    if (updates.mobile && updates.mobile !== existingUser.mobile) {
      const userWithMobile = await findUserByMobile(updates.mobile);
      if (userWithMobile && userWithMobile.userId !== userId) {
        throw new Error("Mobile number already in use by another account");
      }
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    if (updates.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = updates.name;
    }
    
    if (updates.email !== undefined) {
      updateExpressions.push('#email = :email');
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = updates.email.toLowerCase();
    }
    
    if (updates.mobile !== undefined) {
      updateExpressions.push('#mobile = :mobile');
      expressionAttributeNames['#mobile'] = 'mobile';
      expressionAttributeValues[':mobile'] = updates.mobile;
    }
    
    if (updates.address !== undefined) {
      updateExpressions.push('#address = :address');
      expressionAttributeNames['#address'] = 'address';
      expressionAttributeValues[':address'] = updates.address;
    }
    
    if (updates.gstNumber !== undefined) {
      updateExpressions.push('#gstNumber = :gstNumber');
      expressionAttributeNames['#gstNumber'] = 'gstNumber';
      expressionAttributeValues[':gstNumber'] = updates.gstNumber;
    }
    
    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Execute update
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: `set ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW' as const
      })
    );
    
    return result.Attributes as User;
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
}

// Verify JWT token and extract user info
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    console.error("❌ Invalid token:", error);
    return null;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate mobile number (10 digits)
export function isValidMobile(mobile: string): boolean {
  const mobileRegex = /^\d{10}$/;
  return mobileRegex.test(mobile);
}

// Validate GSTIN (15-character alphanumeric)
export function isValidGSTIN(gstin?: string): boolean {
  if (!gstin) return true; // GSTIN is optional
  
  const gstinRegex = /^[0-9A-Z]{15}$/;
  return gstinRegex.test(gstin);
}

export { ddbDocClient };