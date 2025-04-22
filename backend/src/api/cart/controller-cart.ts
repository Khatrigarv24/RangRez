import { Context } from 'hono';
import { ddbDocClient } from '../products/products-services';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { 
  addToCart, 
  getCartItems, 
  removeFromCart, 
  clearCart, 
  getCartItemCount 
} from './services-cart';

// Add or update item in cart
export const addItemToCart = async (c: Context) => {
  try {
    const { userId, productId, quantity } = await c.req.json();

    // Validate required fields
    if (!userId || !productId || quantity === undefined) {
      return c.json({ 
        success: false, 
        error: "Missing required fields: userId, productId, and quantity are required" 
      }, 400);
    }

    // Validate quantity
    if (quantity <= 0) {
      return c.json({
        success: false,
        error: "Quantity must be greater than zero"
      }, 400);
    }

    // Check if product exists
    try {
      const productResult = await ddbDocClient.send(
        new GetCommand({
          TableName: 'products',
          Key: { productId: productId } // Changed from 'id' to 'productId' as the primary key
        })
      );

      if (!productResult.Item) {
        return c.json({
          success: false,
          error: `Product with ID ${productId} does not exist`
        }, 404);
      }

      // Check if there's enough stock
      if (productResult.Item.stock < quantity) {
        return c.json({
          success: false,
          error: `Not enough stock available. Requested: ${quantity}, Available: ${productResult.Item.stock}`
        }, 400);
      }
    } catch (error) {
      console.error(`❌ Error checking product ${productId}:`, error);
    }

    // Add item to cart
    const cartItem = await addToCart(userId, productId, quantity);

    return c.json({
      success: true,
      message: "Item added to cart successfully",
      cartItem
    });
  } catch (error) {
    console.error("❌ Error adding item to cart:", error);
    return c.json({
      success: false,
      error: "Failed to add item to cart",
      details: error.message
    }, 500);
  }
};

// Get user's cart items
export const getUserCart = async (c: Context) => {
  try {
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({
        success: false,
        error: "User ID is required"
      }, 400);
    }

    // Get cart items
    const cartItems = await getCartItems(userId);
    
    // If we want to include product details in the response
    const cartItemsWithDetails = await Promise.all(
      cartItems.map(async (item) => {
        try {
          // Get product details from the products table, not cart-items
          const productResult = await ddbDocClient.send(
            new GetCommand({
              TableName: 'products',
              Key: { productId: item.productId } // Changed from 'id' to 'productId'
            })
          );
          
          return {
            ...item,
            productDetails: productResult.Item || null
          };
        } catch (error) {
          console.error(`❌ Error fetching product details for ${item.productId}:`, error);
          return item;
        }
      })
    );

    return c.json({
      success: true,
      cartItems: cartItemsWithDetails,
      itemCount: cartItemsWithDetails.length,
      totalQuantity: cartItemsWithDetails.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error("❌ Error fetching cart items:", error);
    return c.json({
      success: false,
      error: "Failed to fetch cart items",
      details: error.message
    }, 500);
  }
};

// Remove item from cart
export const removeItemFromCart = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    const productId = c.req.param('productId');

    if (!userId || !productId) {
      return c.json({
        success: false,
        error: "User ID and product ID are required"
      }, 400);
    }

    // Remove item from cart
    await removeFromCart(userId, productId);

    return c.json({
      success: true,
      message: "Item removed from cart successfully"
    });
  } catch (error) {
    console.error("❌ Error removing item from cart:", error);
    return c.json({
      success: false,
      error: "Failed to remove item from cart",
      details: error.message
    }, 500);
  }
};

// Clear user's entire cart
export const clearUserCart = async (c: Context) => {
  try {
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({
        success: false,
        error: "User ID is required"
      }, 400);
    }

    // Clear cart
    await clearCart(userId);

    return c.json({
      success: true,
      message: "Cart cleared successfully"
    });
  } catch (error) {
    console.error("❌ Error clearing cart:", error);
    return c.json({
      success: false,
      error: "Failed to clear cart",
      details: error.message
    }, 500);
  }
};
