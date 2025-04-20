import { Context } from 'hono';
import { 
  registerUser, 
  loginUser, 
  findUserByEmail, 
  findUserByMobile,
  isValidEmail,
  isValidMobile,
  isValidGSTIN
} from './services-auth';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Register a new user
export const register = async (c: Context) => {
  try {
    // Get registration data from request body
    const { email, mobile, password, gstNumber } = await c.req.json();

    // Validate required fields
    if (!email || !mobile || !password) {
      return c.json({
        success: false,
        error: "Missing required fields: email, mobile, and password are required"
      }, 400);
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return c.json({
        success: false,
        error: "Invalid email format"
      }, 400);
    }

    // Validate mobile format (10 digits)
    if (!isValidMobile(mobile)) {
      return c.json({
        success: false,
        error: "Invalid mobile number. Must be 10 digits"
      }, 400);
    }

    // Validate GSTIN format if provided
    if (gstNumber && !isValidGSTIN(gstNumber)) {
      return c.json({
        success: false,
        error: "Invalid GSTIN format. Must be 15 characters alphanumeric"
      }, 400);
    }

    // Check if email already exists
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
      return c.json({
        success: false,
        error: "Email already registered"
      }, 409); // Conflict
    }

    // Check if mobile already exists
    const existingUserByMobile = await findUserByMobile(mobile);
    if (existingUserByMobile) {
      return c.json({
        success: false,
        error: "Mobile number already registered"
      }, 409); // Conflict
    }

    // Register the new user
    const user = await registerUser(email, mobile, password, gstNumber);

    // Remove password hash from response
    const { passwordHash, ...userResponse } = user;

    return c.json({
      success: true,
      message: "Registration successful",
      user: userResponse
    }, 201);
  } catch (error) {
    console.error("❌ Error during registration:", error);
    return c.json({
      success: false,
      error: "Registration failed",
      details: error.message
    }, 500);
  }
};

// Login user
export const login = async (c: Context) => {
  try {
    // Get login data from request body
    const { emailOrMobile, password } = await c.req.json();

    // Validate required fields
    if (!emailOrMobile || !password) {
      return c.json({
        success: false,
        error: "Missing required fields: emailOrMobile and password are required"
      }, 400);
    }

    // Attempt login
    const result = await loginUser(emailOrMobile, password);

    // Check if login was successful
    if (!result) {
      return c.json({
        success: false,
        error: "Invalid credentials"
      }, 401); // Unauthorized
    }

    // Return successful login response with token and user details
    return c.json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    return c.json({
      success: false,
      error: "Login failed",
      details: error.message
    }, 500);
  }
};

// Make user admin
export const makeUserAdmin = async (c: Context, userId: string) => {
  try {
    const { ddbDocClient } = await import('../products/products-services');
    const USERS_TABLE = process.env.USERS_TABLE || 'users';
    
    // Update user to have admin privileges
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET isAdmin = :isAdmin',
        ExpressionAttributeValues: {
          ':isAdmin': true
        },
        ReturnValues: 'ALL_NEW'
      })
    );
    
    return c.json({
      success: true,
      message: `User ${userId} has been given admin privileges`
    });
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    return c.json({
      success: false,
      error: 'Failed to update user to admin',
      details: error.message
    }, 500);
  }
};