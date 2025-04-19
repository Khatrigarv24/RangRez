import { Context } from 'hono';
import { ddbDocClient } from '../products/products-services';
import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getUserById } from '../auth/services-auth';

// Define the orders table name
const ORDERS_TABLE = 'orders';

// Valid order statuses
const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];

/**
 * Get all orders with pagination and filtering
 */
export const getAllOrders = async (c: Context) => {
  try {
    // Get pagination and filter parameters
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status');
    const userId = c.req.query('userId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    
    // Build filter expressions
    const filterExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Add status filter if provided
    if (status && VALID_STATUSES.includes(status)) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'paymentStatus';
      expressionAttributeValues[':status'] = status;
    }
    
    // Add userId filter if provided
    if (userId) {
      filterExpressions.push('userId = :userId');
      expressionAttributeValues[':userId'] = userId;
    }
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filterExpressions.push('createdAt BETWEEN :startDate AND :endDate');
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      filterExpressions.push('createdAt >= :startDate');
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      filterExpressions.push('createdAt <= :endDate');
      expressionAttributeValues[':endDate'] = endDate;
    }
    
    // Build scan params
    const scanParams: any = {
      TableName: ORDERS_TABLE,
      Limit: 1000 // We'll filter down to our pagination limit after getting the results
    };
    
    // Add filter expression if any filters were provided
    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      
      // Add ExpressionAttributeNames only if they are used
      if (Object.keys(expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
      }
    }
    
    // Execute scan
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand(scanParams));
    
    // Apply simple pagination to the results
    const startIndex = (page - 1) * limit;
    const paginatedOrders = Items.slice(startIndex, startIndex + limit);
    const totalOrders = Items.length;
    const totalPages = Math.ceil(totalOrders / limit);
    
    // Enhance orders with user information (in a real application, consider handling this with a batch operation)
    const enhancedOrders = await Promise.all(
      paginatedOrders.map(async (order) => {
        try {
          const user = await getUserById(order.userId);
          return {
            ...order,
            userDetails: user ? {
              email: user.email,
              mobile: user.mobile,
              name: user.name || 'Unknown',
              isB2B: user.isB2B || false
            } : null
          };
        } catch (error) {
          return order;
        }
      })
    );
    
    return c.json({
      success: true,
      orders: enhancedOrders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages,
        hasMore: LastEvaluatedKey !== undefined || page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch orders',
      details: error.message
    }, 500);
  }
};

/**
 * Get a single order by ID
 */
export const getOrderById = async (c: Context) => {
  try {
    const orderId = c.req.param('orderId');
    
    // Get the order from DynamoDB
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId }
      })
    );
    
    if (!result.Item) {
      return c.json({
        success: false,
        error: 'Order not found'
      }, 404);
    }
    
    const order = result.Item;
    
    // Get user information
    try {
      const user = await getUserById(order.userId);
      if (user) {
        order.userDetails = {
          email: user.email,
          mobile: user.mobile,
          name: user.name || 'Unknown',
          gstNumber: user.gstNumber,
          isB2B: user.isB2B || false,
          address: user.address
        };
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
    }
    
    return c.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch order',
      details: error.message
    }, 500);
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (c: Context) => {
  try {
    const orderId = c.req.param('orderId');
    const { status, trackingInfo, notes } = await c.req.json();
    
    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return c.json({
        success: false,
        error: `Invalid status. Valid values are: ${VALID_STATUSES.join(', ')}`
      }, 400);
    }
    
    // Check if order exists
    const orderResult = await ddbDocClient.send(
      new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId }
      })
    );
    
    if (!orderResult.Item) {
      return c.json({
        success: false,
        error: 'Order not found'
      }, 404);
    }
    
    // Get admin info from context
    const admin = c.get('user');
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues: Record<string, any> = {};
    
    // Update status
    updateExpressions.push('paymentStatus = :status');
    expressionAttributeValues[':status'] = status;
    
    // Add tracking info if provided
    if (trackingInfo) {
      updateExpressions.push('trackingInfo = :trackingInfo');
      expressionAttributeValues[':trackingInfo'] = trackingInfo;
    }
    
    // Add admin notes if provided
    if (notes) {
      updateExpressions.push('adminNotes = :notes');
      expressionAttributeValues[':notes'] = notes;
    }
    
    // Add updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Add updated by info if available
    if (admin) {
      updateExpressions.push('updatedBy = :updatedBy');
      expressionAttributeValues[':updatedBy'] = admin.userId;
    }
    
    // Add status history entry
    const previousStatus = orderResult.Item.paymentStatus || 'pending';
    const statusHistory = orderResult.Item.statusHistory || [];
    
    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      updatedBy: admin?.userId || 'system',
      notes
    });
    
    updateExpressions.push('statusHistory = :statusHistory');
    expressionAttributeValues[':statusHistory'] = statusHistory;
    
    // Execute update
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      })
    );
    
    return c.json({
      success: true,
      message: `Order status updated from ${previousStatus} to ${status}`,
      order: result.Attributes
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return c.json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    }, 500);
  }
};