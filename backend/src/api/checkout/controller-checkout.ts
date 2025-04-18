import { Context } from 'hono';
import {
  validateAndCalculateCart,
  createOrder,
  createRazorpayOrder,
  updateProductStock
} from './services-checkout';
import { clearCart } from '../cart/services-cart';
import { getUserById } from '../auth/services-auth';

// Process checkout
export const processCheckout = async (c: Context) => {
  try {
    // Get checkout data from request body
    const { userId, shippingAddress, paymentMethod } = await c.req.json();

    // Validate required fields
    if (!userId) {
      return c.json({
        success: false,
        error: "Missing required fields: userId is required"
      }, 400);
    }

    // Check if user exists
    const user = await getUserById(userId);
    
    if (!user) {
      return c.json({
        success: false,
        error: "Invalid user ID"
      }, 400);
    }

    // Validate cart and calculate totals
    const cartValidation = await validateAndCalculateCart(userId);
    
    if (!cartValidation.isValid) {
      return c.json({
        success: false,
        error: cartValidation.error || "Invalid cart"
      }, 400);
    }
    
    const { cartItems, subtotal, gst, total } = cartValidation;

    // Create order in database
    const order = await createOrder(
      userId,
      cartItems,
      subtotal,
      gst,
      total,
      shippingAddress
    );

    // Create payment order (e.g., with Razorpay)
    const paymentOrder = await createRazorpayOrder(total, order.orderId);

    // Clear user's cart after successful order creation
    await clearCart(userId);
    
    // Update product stock (decrease quantities)
    await updateProductStock(cartItems);

    // Return success response with order details and payment info
    return c.json({
      success: true,
      message: "Checkout successful, payment initiated",
      order: {
        orderId: order.orderId,
        userId: order.userId,
        products: order.products,
        subtotal: order.subtotal,
        gst: order.gst,
        total: order.total,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      },
      payment: {
        id: paymentOrder.id,
        amount: paymentOrder.amount / 100, // Convert back to rupees for display
        currency: paymentOrder.currency,
        // Add more Razorpay-specific fields as needed for the frontend
      }
    });
  } catch (error) {
    console.error("❌ Error processing checkout:", error);
    return c.json({
      success: false,
      error: "Checkout failed",
      details: error.message
    }, 500);
  }
};