import { Context } from 'hono';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../products/products-services';

const USERS_TABLE = 'users';
const ORDERS_TABLE = 'orders';
const PRODUCTS_TABLE = 'products';

/**
 * Get dashboard analytics data
 * - Total users
 * - Total orders
 * - Total revenue
 * - Best selling products
 * - Order count by status
 */
export const getDashboardAnalytics = async (c: Context) => {
  try {
    // Get date range parameters (optional)
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    
    // Gather all analytics data concurrently
    const [
      usersData,
      ordersData,
      ordersByStatusData,
      bestSellingProductsData
    ] = await Promise.all([
      getTotalUsers(),
      getOrdersAndRevenue(startDate, endDate),
      getOrdersByStatus(startDate, endDate),
      getBestSellingProducts(startDate, endDate)
    ]);
    
    // Format the response with all analytics data
    return c.json({
      success: true,
      analytics: {
        users: usersData,
        orders: ordersData.orders,
        revenue: ordersData.revenue,
        ordersByStatus: ordersByStatusData,
        bestSellingProducts: bestSellingProductsData
      },
      timeRange: {
        startDate: startDate || 'all time',
        endDate: endDate || 'present'
      }
    });
  } catch (error) {
    console.error('❌ Error gathering analytics data:', error);
    return c.json({
      success: false,
      error: 'Failed to get analytics data',
      details: error.message
    }, 500);
  }
};

/**
 * Get total user count and active users
 */
async function getTotalUsers(): Promise<{
  total: number;
  active: number;
  b2b: number;
}> {
  try {
    // Get all users
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        Select: 'COUNT',
      })
    );
    
    const totalCount = result.Count || 0;
    
    // Get active users (users who logged in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    const activeUsersResult = await ddbDocClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'lastLogin >= :thirtyDaysAgo',
        ExpressionAttributeValues: {
          ':thirtyDaysAgo': thirtyDaysAgoStr
        },
        Select: 'COUNT'
      })
    );
    
    const activeCount = activeUsersResult.Count || 0;
    
    // Get B2B users
    const b2bUsersResult = await ddbDocClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'isB2B = :isB2B',
        ExpressionAttributeValues: {
          ':isB2B': true
        },
        Select: 'COUNT'
      })
    );
    
    const b2bCount = b2bUsersResult.Count || 0;
    
    return {
      total: totalCount,
      active: activeCount,
      b2b: b2bCount
    };
  } catch (error) {
    console.error('❌ Error getting user analytics:', error);
    throw error;
  }
}

/**
 * Get total orders and revenue
 */
async function getOrdersAndRevenue(startDate?: string, endDate?: string): Promise<{
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}> {
  try {
    // Set up date filters
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString();
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString();
    
    // Build scan params based on date range
    let scanParams: any = {
      TableName: ORDERS_TABLE
    };
    
    if (startDate && endDate) {
      scanParams.FilterExpression = 'createdAt BETWEEN :startDate AND :endDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate,
        ':endDate': endDate
      };
    } else if (startDate) {
      scanParams.FilterExpression = 'createdAt >= :startDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate
      };
    } else if (endDate) {
      scanParams.FilterExpression = 'createdAt <= :endDate';
      scanParams.ExpressionAttributeValues = {
        ':endDate': endDate
      };
    }
    
    // Get all orders
    const result = await ddbDocClient.send(new ScanCommand(scanParams));
    const orders = result.Items || [];
    
    // Calculate totals
    let totalRevenue = 0;
    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    
    let todayOrders = 0;
    let weekOrders = 0;
    let monthOrders = 0;
    
    orders.forEach(order => {
      // Only count completed orders for revenue
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'delivered' || order.paymentStatus === 'shipped') {
        const orderTotal = order.total || 0;
        const createdAt = order.createdAt;
        
        totalRevenue += orderTotal;
        
        if (createdAt >= todayStart) {
          todayRevenue += orderTotal;
          todayOrders++;
        }
        
        if (createdAt >= weekStartStr) {
          weekRevenue += orderTotal;
          weekOrders++;
        }
        
        if (createdAt >= monthStartStr) {
          monthRevenue += orderTotal;
          monthOrders++;
        }
      }
    });
    
    return {
      orders: {
        total: orders.length,
        today: todayOrders,
        thisWeek: weekOrders,
        thisMonth: monthOrders
      },
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
        today: parseFloat(todayRevenue.toFixed(2)),
        thisWeek: parseFloat(weekRevenue.toFixed(2)),
        thisMonth: parseFloat(monthRevenue.toFixed(2))
      }
    };
  } catch (error) {
    console.error('❌ Error getting order and revenue analytics:', error);
    throw error;
  }
}

/**
 * Get order counts by status
 */
async function getOrdersByStatus(startDate?: string, endDate?: string): Promise<{
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  failed: number;
}> {
  try {
    // Build scan params based on date range
    let scanParams: any = {
      TableName: ORDERS_TABLE
    };
    
    if (startDate && endDate) {
      scanParams.FilterExpression = 'createdAt BETWEEN :startDate AND :endDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate,
        ':endDate': endDate
      };
    } else if (startDate) {
      scanParams.FilterExpression = 'createdAt >= :startDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate
      };
    } else if (endDate) {
      scanParams.FilterExpression = 'createdAt <= :endDate';
      scanParams.ExpressionAttributeValues = {
        ':endDate': endDate
      };
    }
    
    // Get all orders
    const result = await ddbDocClient.send(new ScanCommand(scanParams));
    const orders = result.Items || [];
    
    // Count orders by status
    const statusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0
    };
    
    orders.forEach(order => {
      const status = order.paymentStatus || 'pending';
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });
    
    return statusCounts;
  } catch (error) {
    console.error('❌ Error getting order status analytics:', error);
    throw error;
  }
}

/**
 * Get best selling products
 */
async function getBestSellingProducts(startDate?: string, endDate?: string): Promise<Array<{
  productId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  imageUrl?: string;
}>> {
  try {
    // Build scan params based on date range
    let scanParams: any = {
      TableName: ORDERS_TABLE
    };
    
    if (startDate && endDate) {
      scanParams.FilterExpression = 'createdAt BETWEEN :startDate AND :endDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate,
        ':endDate': endDate
      };
    } else if (startDate) {
      scanParams.FilterExpression = 'createdAt >= :startDate';
      scanParams.ExpressionAttributeValues = {
        ':startDate': startDate
      };
    } else if (endDate) {
      scanParams.FilterExpression = 'createdAt <= :endDate';
      scanParams.ExpressionAttributeValues = {
        ':endDate': endDate
      };
    }
    
    // Get all orders
    const result = await ddbDocClient.send(new ScanCommand(scanParams));
    const orders = result.Items || [];
    
    // Map to track product sales
    const productSales: Record<string, { 
      productId: string;
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      imageUrl?: string;
    }> = {};
    
    // Process each order
    orders.forEach(order => {
      // Only count completed orders
      if (order.paymentStatus === 'paid' || order.paymentStatus === 'delivered' || order.paymentStatus === 'shipped') {
        const products = order.products || [];
        
        products.forEach((product: any) => {
          const productId = product.productId;
          const quantity = product.quantity || 0;
          const price = product.price || 0;
          const revenue = quantity * price;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              productId,
              name: product.name || 'Unknown Product',
              totalQuantity: 0,
              totalRevenue: 0,
              imageUrl: product.imageUrl
            };
          }
          
          productSales[productId].totalQuantity += quantity;
          productSales[productId].totalRevenue += revenue;
        });
      }
    });
    
    // Convert to array and sort by quantity sold (descending)
    const bestSellingProducts = Object.values(productSales).sort((a, b) => 
      b.totalQuantity - a.totalQuantity
    );
    
    // Return top 10 products
    return bestSellingProducts.slice(0, 10).map(product => ({
      ...product,
      totalRevenue: parseFloat(product.totalRevenue.toFixed(2))
    }));
  } catch (error) {
    console.error('❌ Error getting best selling products:', error);
    throw error;
  }
}