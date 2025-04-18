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
        TableName: 'invoices', // Using existing invoice table
        Key: { invoiceId: orderId }
      })
    );
    
    if (!orderResult.Item) {
      return c.json({
        success: false,
        error: "Order not found"
      }, 404);
    }
    
    const order = orderResult.Item;
    
    // Get additional user information if available
    let userData: any = null;
    
    if (order.customerId) {
      userData = await getUserById(order.customerId);
    }
    
    // Prepare invoice data
    const invoiceData: InvoiceData = {
      orderId: order.invoiceId,
      orderDate: order.createdAt,
      customer: {
        id: order.customerId || 'guest',
        name: order.customerName || '',
        email: order.customerEmail || (userData?.email || ''),
        phone: order.customerPhone || (userData?.mobile || ''),
        gstNumber: userData?.gstNumber || '',
      },
      billingAddress: {
        street: order.customerAddress || (userData?.address || ''),
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      },
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        description: '', // Add description if available
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      subtotal: order.total || 0,
      gst: order.tax || 0,
      total: order.grandTotal || 0,
      paymentMethod: order.paymentMethod || 'Cash',
      paymentStatus: order.status || 'paid',
    };
    
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