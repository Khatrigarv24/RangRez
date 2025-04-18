import { Context } from 'hono';
import { ddbDocClient } from '../products/products-services';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getWishlistItems, 
  isItemInWishlist
} from './services-wishlist';

// Toggle item in wishlist (add if not exists, remove if exists)
export const toggleWishlistItem = async (c: Context) => {
  try {
    const { userId, productId } = await c.req.json();

    // Validate required fields
    if (!userId || !productId) {
      return c.json({ 
        success: false, 
        error: "Missing required fields: userId and productId are required" 
      }, 400);
    }

    // Check if product exists
    try {
      const productResult = await ddbDocClient.send(
        new GetCommand({
          TableName: 'discts', // Using the existing products table
          Key: { productId }
        })
      );

      if (!productResult.Item) {
        return c.json({
          success: false,
          error: `Product with ID ${productId} does not exist`
        }, 404);
      }
    } catch (error) {
      console.error(`❌ Error checking product ${productId}:`, error);
      return c.json({
        success: false,
        error: `Error checking product availability`,
        details: error.message
      }, 500);
    }

    // Check if the product is already in the wishlist
    const exists = await isItemInWishlist(userId, productId);
    
    if (exists) {
      // Remove from wishlist if already exists
      await removeFromWishlist(userId, productId);
      return c.json({
        success: true,
        message: "Product removed from wishlist",
        action: "removed"
      });
    } else {
      // Add to wishlist if not exists
      const wishlistItem = await addToWishlist(userId, productId);
      return c.json({
        success: true,
        message: "Product added to wishlist",
        action: "added",
        wishlistItem
      });
    }
  } catch (error) {
    console.error("❌ Error toggling wishlist item:", error);
    return c.json({
      success: false,
      error: "Failed to update wishlist",
      details: error.message
    }, 500);
  }
};

// Get user's wishlist items
export const getUserWishlist = async (c: Context) => {
  try {
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({
        success: false,
        error: "User ID is required"
      }, 400);
    }

    // Get wishlist items
    const wishlistItems = await getWishlistItems(userId);
    
    // Include product details in the response
    const wishlistItemsWithDetails = await Promise.all(
      wishlistItems.map(async (item) => {
        try {
          // Get product details
          const productResult = await ddbDocClient.send(
            new GetCommand({
              TableName: 'discts',
              Key: { productId: item.productId }
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
      wishlistItems: wishlistItemsWithDetails,
      count: wishlistItemsWithDetails.length
    });
  } catch (error) {
    console.error("❌ Error fetching wishlist items:", error);
    return c.json({
      success: false,
      error: "Failed to fetch wishlist items",
      details: error.message
    }, 500);
  }
};

// Remove item from wishlist (explicit remove endpoint)
export const removeWishlistItem = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    const productId = c.req.param('productId');

    if (!userId || !productId) {
      return c.json({
        success: false,
        error: "User ID and product ID are required"
      }, 400);
    }

    // Check if item exists in wishlist
    const exists = await isItemInWishlist(userId, productId);
    
    if (!exists) {
      return c.json({
        success: false,
        error: "Item not found in wishlist"
      }, 404);
    }

    // Remove item from wishlist
    await removeFromWishlist(userId, productId);

    return c.json({
      success: true,
      message: "Item removed from wishlist successfully"
    });
  } catch (error) {
    console.error("❌ Error removing wishlist item:", error);
    return c.json({
      success: false,
      error: "Failed to remove item from wishlist",
      details: error.message
    }, 500);
  }
};