import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Create S3 client using existing credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    sessionToken: process.env.AWS_SESSION_TOKEN as string,
  },
});

// S3 bucket name - you should add this to your .env file
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'rangrez-uploads';

// Define invoice data structure
export interface InvoiceData {
  orderId: string;
  orderDate: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    gstNumber?: string;
  };
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
}

/**
 * Generate PDF invoice using pdf-lib
 */
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Define colors
  const black = rgb(0, 0, 0);
  const gray = rgb(0.5, 0.5, 0.5);
  
  // Set margins
  const margin = 50;
  const width = page.getWidth() - 2 * margin;
  
  // Draw header
  let yPos = page.getHeight() - margin;
  
  // Company name
  page.drawText('RANGREZ TEXTILE', {
    x: margin,
    y: yPos,
    size: 24,
    font: helveticaBold,
    color: black,
  });
  
  yPos -= 20;
  // Company address
  page.drawText('123 Fashion Street, Design District', {
    x: margin,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: gray,
  });
  
  yPos -= 14;
  page.drawText('New Delhi, India - 110001', {
    x: margin,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: gray,
  });
  
  yPos -= 14;
  page.drawText('Phone: +91-1234567890 | Email: info@rangrez.com', {
    x: margin,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: gray,
  });
  
  // Invoice title and number
  yPos -= 40;
  page.drawText(`INVOICE #${invoiceData.orderId}`, {
    x: margin,
    y: yPos,
    size: 16,
    font: helveticaBold,
    color: black,
  });
  
  // Draw a horizontal line
  yPos -= 20;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: margin + width, y: yPos },
    thickness: 1,
    color: gray,
  });
  
  // Invoice details
  yPos -= 30;
  
  // Left column - Customer info
  let leftColX = margin;
  let currentY = yPos;
  
  page.drawText('Bill To:', {
    x: leftColX,
    y: currentY,
    size: 12,
    font: helveticaBold,
    color: black,
  });
  
  currentY -= 20;
  page.drawText(invoiceData.customer.name, {
    x: leftColX,
    y: currentY,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  if (invoiceData.billingAddress.street) {
    currentY -= 14;
    page.drawText(invoiceData.billingAddress.street, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  if (invoiceData.billingAddress.city || invoiceData.billingAddress.state) {
    const cityState = [
      invoiceData.billingAddress.city,
      invoiceData.billingAddress.state
    ].filter(Boolean).join(', ');
    
    currentY -= 14;
    page.drawText(cityState, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  if (invoiceData.billingAddress.postalCode || invoiceData.billingAddress.country) {
    const postalCountry = [
      invoiceData.billingAddress.postalCode,
      invoiceData.billingAddress.country
    ].filter(Boolean).join(', ');
    
    currentY -= 14;
    page.drawText(postalCountry, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  if (invoiceData.customer.phone) {
    currentY -= 14;
    page.drawText(`Phone: ${invoiceData.customer.phone}`, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  if (invoiceData.customer.email) {
    currentY -= 14;
    page.drawText(`Email: ${invoiceData.customer.email}`, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  if (invoiceData.customer.gstNumber) {
    currentY -= 14;
    page.drawText(`GST Number: ${invoiceData.customer.gstNumber}`, {
      x: leftColX,
      y: currentY,
      size: 10,
      font: helveticaFont,
      color: black,
    });
  }
  
  // Right column - Invoice info
  const rightColX = margin + width - 180;
  currentY = yPos;
  
  page.drawText('Invoice Details:', {
    x: rightColX,
    y: currentY,
    size: 12,
    font: helveticaBold,
    color: black,
  });
  
  currentY -= 20;
  page.drawText(`Invoice Date: ${formatDate(new Date(invoiceData.orderDate))}`, {
    x: rightColX,
    y: currentY,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  currentY -= 14;
  page.drawText(`Order ID: ${invoiceData.orderId}`, {
    x: rightColX,
    y: currentY,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  currentY -= 14;
  page.drawText(`Payment Method: ${invoiceData.paymentMethod}`, {
    x: rightColX,
    y: currentY,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  currentY -= 14;
  page.drawText(`Payment Status: ${invoiceData.paymentStatus.toUpperCase()}`, {
    x: rightColX,
    y: currentY,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  // Table header
  yPos = Math.min(currentY, yPos) - 50;
  
  const colWidths = {
    sno: 30,
    name: 160,
    qty: 60,
    price: 80,
    subtotal: 100,
  };
  
  const col1X = margin;
  const col2X = col1X + colWidths.sno;
  const col3X = col2X + colWidths.name;
  const col4X = col3X + colWidths.qty;
  const col5X = col4X + colWidths.price;
  
  // Draw table header
  page.drawText('S.No', {
    x: col1X,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText('Item Description', {
    x: col2X,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText('Qty', {
    x: col3X,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText('Price', {
    x: col4X,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText('Subtotal', {
    x: col5X,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  
  // Draw line under header
  yPos -= 10;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: margin + width, y: yPos },
    thickness: 1,
    color: gray,
  });
  yPos -= 15;
  
  // Draw table rows
  let rowNum = 1;
  for (const item of invoiceData.items) {
    // Check if we need a new page
    if (yPos < margin + 100) {
      // Add a new page and reset yPos
      page = pdfDoc.addPage([595.28, 841.89]);
      yPos = page.getHeight() - margin;
      
      // Draw header on new page
      page.drawText('INVOICE CONTINUED', {
        x: margin,
        y: yPos,
        size: 14,
        font: helveticaBold,
        color: black,
      });
      
      yPos -= 40;
    }
    
    page.drawText(`${rowNum}`, {
      x: col1X,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: black,
    });
    
    page.drawText(item.name, {
      x: col2X,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: black,
    });
    
    page.drawText(`${item.quantity}`, {
      x: col3X,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: black,
    });
    
    page.drawText(`₹${formatCurrency(item.price)}`, {
      x: col4X,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: black,
    });
    
    page.drawText(`₹${formatCurrency(item.subtotal)}`, {
      x: col5X,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: black,
    });
    
    yPos -= 20;
    rowNum++;
  }
  
  // Draw line after items
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: margin + width, y: yPos },
    thickness: 1,
    color: gray,
  });
  
  yPos -= 20;
  
  // Summary section
  const summaryRightX = margin + width;
  
  page.drawText('Subtotal:', {
    x: summaryRightX - 120,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  page.drawText(`₹${formatCurrency(invoiceData.subtotal)}`, {
    x: summaryRightX - 70,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: black,
    align: 'right',
  });
  
  yPos -= 15;
  
  page.drawText('GST (18%):', {
    x: summaryRightX - 120,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  page.drawText(`₹${formatCurrency(invoiceData.gst)}`, {
    x: summaryRightX - 70,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: black,
    align: 'right',
  });
  
  yPos -= 15;
  
  page.drawLine({
    start: { x: summaryRightX - 120, y: yPos },
    end: { x: summaryRightX, y: yPos },
    thickness: 0.5,
    color: gray,
  });
  
  yPos -= 15;
  
  page.drawText('Total:', {
    x: summaryRightX - 120,
    y: yPos,
    size: 12,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText(`₹${formatCurrency(invoiceData.total)}`, {
    x: summaryRightX - 70,
    y: yPos,
    size: 12,
    font: helveticaBold,
    color: black,
    align: 'right',
  });
  
  yPos -= 40;
  
  // Draw a line above footer
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: margin + width, y: yPos },
    thickness: 1,
    color: gray,
  });
  
  yPos -= 20;
  
  // Footer
  page.drawText('Thank you for your business!', {
    x: page.getWidth() / 2 - 80,
    y: yPos,
    size: 12,
    font: helveticaBold,
    color: black,
  });
  
  yPos -= 15;
  
  page.drawText('For inquiries, please contact support@rangrez.com', {
    x: page.getWidth() / 2 - 120,
    y: yPos,
    size: 10,
    font: helveticaFont,
    color: black,
  });
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Upload the invoice PDF to S3 and return a presigned URL
 */
export async function uploadInvoiceToS3(pdfBytes: Uint8Array, orderId: string): Promise<string> {
  const uniqueFileName = `invoices/${orderId}/${uuidv4()}.pdf`;
  
  try {
    // Upload file to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    }));
    
    // Generate a presigned URL (valid for 1 hour)
    const getObjectParams = {
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
    };
    
    const url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 3600,
    });
    
    return url;
  } catch (error) {
    console.error('❌ Error uploading invoice to S3:', error);
    throw new Error('Failed to upload invoice');
  }
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// Format currency with 2 decimal places
function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}