import { Context } from 'hono';
import { 
  getUserById, 
  updateUserProfile, 
  isValidEmail, 
  isValidMobile, 
  isValidGSTIN 
} from '../auth/services-auth';

// Get user profile
export const getUserProfile = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    
    // Get user from database
    const user = await getUserById(userId);
    
    if (!user) {
      return c.json({
        success: false,
        error: "User not found"
      }, 404);
    }
    
    // Remove sensitive data from response
    const { passwordHash, ...userProfile } = user;
    
    return c.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    return c.json({
      success: false,
      error: "Failed to fetch user profile",
      details: error.message
    }, 500);
  }
};

// Update user profile
export const updateUserProfileHandler = async (c: Context) => {
  try {
    const userId = c.req.param('userId');
    const updates = await c.req.json();
    
    // Validate email if provided
    if (updates.email && !isValidEmail(updates.email)) {
      return c.json({
        success: false,
        error: "Invalid email format"
      }, 400);
    }
    
    // Validate mobile if provided
    if (updates.mobile && !isValidMobile(updates.mobile)) {
      return c.json({
        success: false,
        error: "Invalid mobile number format. Must be 10 digits"
      }, 400);
    }
    
    // Validate GSTIN if provided
    if (updates.gstNumber && !isValidGSTIN(updates.gstNumber)) {
      return c.json({
        success: false,
        error: "Invalid GSTIN format. Must be 15 characters alphanumeric"
      }, 400);
    }
    
    // Only allow specific fields to be updated
    const allowedUpdates = {
      name: updates.name,
      email: updates.email,
      mobile: updates.mobile,
      address: updates.address,
      gstNumber: updates.gstNumber
    };
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );
    
    // Check if there's anything to update
    if (Object.keys(filteredUpdates).length === 0) {
      return c.json({
        success: false,
        error: "No valid fields to update"
      }, 400);
    }
    
    // Update user profile
    const updatedUser = await updateUserProfile(userId, filteredUpdates);
    
    if (!updatedUser) {
      return c.json({
        success: false,
        error: "User not found"
      }, 404);
    }
    
    // Remove sensitive data from response
    const { passwordHash, ...updatedProfile } = updatedUser;
    
    return c.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedProfile
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    
    // Handle specific error types
    if (error.message.includes("already in use")) {
      return c.json({
        success: false,
        error: error.message
      }, 409); // Conflict
    }
    
    return c.json({
      success: false,
      error: "Failed to update profile",
      details: error.message
    }, 500);
  }
};