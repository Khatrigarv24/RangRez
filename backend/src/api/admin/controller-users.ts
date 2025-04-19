import { Context } from 'hono';
import { ddbDocClient } from '../auth/services-auth';
import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Define the users table name 
const USERS_TABLE = 'users';

/**
 * Get all users with pagination
 */
export const getAllUsers = async (c: Context) => {
  try {
    // Get pagination parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    
    // Calculate pagination values
    const startIndex = (page - 1) * limit;
    
    // Scan users table
    const scanParams = {
      TableName: USERS_TABLE,
      Limit: 1000 // We'll filter down to our pagination limit after getting the results
    };
    
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand(scanParams));
    
    // Filter only the fields we want to expose
    const users = Items.map(user => ({
      userId: user.userId,
      email: user.email,
      mobile: user.mobile,
      name: user.name || '',
      isB2B: user.isB2B || false,
      gstNumber: user.gstNumber || '',
      isBlocked: user.isBlocked || false,
      address: user.address || '',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || '',
      orderCount: user.orderCount || 0
    }));
    
    // Apply simple pagination to the results
    const paginatedUsers = users.slice(startIndex, startIndex + limit);
    const totalUsers = users.length;
    const totalPages = Math.ceil(totalUsers / limit);
    
    return c.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
        hasMore: LastEvaluatedKey !== undefined || page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message
    }, 500);
  }
};

/**
 * Update a user's status or details
 */
export const updateUser = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    const updates = await c.req.json();
    
    // Check if user exists
    const userResult = await ddbDocClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      })
    );
    
    if (!userResult.Item) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Admin can update these fields
    const allowedFields = ['isBlocked', 'isB2B', 'notes', 'adminComments'];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = updates[field];
      }
    });
    
    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Get admin info
    const admin = c.get('user');
    if (admin) {
      updateExpressions.push('#updatedBy = :updatedBy');
      expressionAttributeNames['#updatedBy'] = 'updatedBy';
      expressionAttributeValues[':updatedBy'] = admin.userId;
    }
    
    // Check if there's anything to update
    if (updateExpressions.length <= 1) { // Only updatedAt exists
      return c.json({
        success: false,
        error: 'No valid fields to update'
      }, 400);
    }
    
    // Execute update
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      })
    );
    
    // Remove sensitive data
    const { passwordHash, ...updatedUser } = result.Attributes || {};
    
    return c.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return c.json({
      success: false,
      error: 'Failed to update user',
      details: error.message
    }, 500);
  }
};

/**
 * Get a single user by ID (admin view)
 */
export const getUserById = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
      })
    );
    
    if (!result.Item) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }
    
    // Remove sensitive data
    const { passwordHash, ...user } = result.Item;
    
    return c.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user',
      details: error.message
    }, 500);
  }
};