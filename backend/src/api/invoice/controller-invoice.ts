import { Context } from 'hono';
import { ddbDocClient } from '../products/products-services';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { generateInvoicePDF, uploadInvoiceToS3, InvoiceData } from './services-invoice';
import { getUserById } from '../auth/services-auth';

// Generate and download invoice for an order
export const generateOrderInvoice = async (c: Context) => {
  try {
    const orderId = c.req.param('orderId');
    
    if (!orderId) {
      return c.json({
        success: false,
        error: "Order ID is required"
      }, 400);
    }
    
    // Fetch the order from DynamoDB
    const orderResult = await ddbDocClient.send(
      new GetCommand({
        TableName: 'orders', // Using existing invoice table
        Key: { orderId: orderId }
      })
    );
    
    if (!orderResult.Item) {
      return c.json({
        success: false,
        error: "Order not found"
      }, 404);
    }
    
    const order = orderResult.Item;
    
    // Debug log order data
    console.log('Order data from DB:', JSON.stringify(order, null, 2));
    
    // Get additional user information if available
    let userData: any = null;
    
    if (order.customerId) {
      userData = await getUserById(order.customerId);
    }
    
    // Prepare invoice data with better default values
    const invoiceData: InvoiceData = {
      orderId: order.invoiceId || order.orderId || 'INV-' + Date.now(),
      orderDate: order.createdAt || new Date().toISOString(),
      customer: {
        id: order.customerId || 'guest',
        name: order.customerName || 'Guest Customer',
        email: order.customerEmail || (userData?.email || 'No email provided'),
        phone: order.customerPhone || (userData?.mobile || 'No phone provided'),
        gstNumber: userData?.gstNumber || 'N/A',
      },
      billingAddress: {
        street: order.customerAddress || (userData?.address || 'Address not provided'),
        city: order.customerCity || (userData?.city || 'City not provided'),
        state: order.customerState || (userData?.state || 'State not provided'),
        postalCode: order.customerPostalCode || (userData?.postalCode || 'Postal code not provided'),
        country: 'India',
      },
      items: Array.isArray(order.items) && order.items.length > 0 
        ? order.items.map((item: any) => ({
            name: item.name || 'Product',
            description: item.description || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            subtotal: item.subtotal || (item.price * item.quantity) || 0,
          }))
        : [{ 
            name: 'Product', 
            description: 'No product details available',
            quantity: 1, 
            price: order.total || 0, 
            subtotal: order.total || 0 
          }],
      subtotal: order.total || 0,
      gst: order.tax || 0,
      total: order.grandTotal || order.total || 0,
      paymentMethod: order.paymentMethod || 'Cash',
      paymentStatus: order.status || 'paid',
    };
    
    // Debug log invoice data
    console.log('Invoice data being sent to PDF generator:', JSON.stringify(invoiceData, null, 2));
    
    // Generate PDF
    const pdfBytes = await generateInvoicePDF(invoiceData);
    
    // Upload the PDF to S3 and get a presigned URL
    const downloadUrl = await uploadInvoiceToS3(pdfBytes, orderId);
    
    return c.json({
      success: true,
      message: "Invoice generated successfully",
      downloadUrl,
      invoiceData
    });
  } catch (error) {
    console.error('❌ Error generating order invoice:', error);
    return c.json({
      success: false,
      error: "Failed to generate invoice",
      details: error.message
    }, 500);
  }
};