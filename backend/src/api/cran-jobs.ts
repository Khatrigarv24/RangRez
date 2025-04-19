import cron from 'node-cron';
import { getLowStockProducts } from './products/products-services';

/**
 * Check for low stock products and potentially send notifications
 */
export async function checkLowStockInventory(): Promise<void> {
  try {
    console.log('🔍 Checking for low stock products...');
    
    // Get products with stock below threshold
    const lowStockProducts = await getLowStockProducts(10);
    
    if (lowStockProducts.length > 0) {
      console.log(`⚠️ Found ${lowStockProducts.length} products with low stock:`);
      
      // Log info about each low stock product
      lowStockProducts.forEach(product => {
        console.log(`- ${product.name} (${product.productId}): ${product.stock} units remaining`);
      });
      
      // Here you would typically:
      // 1. Send email notifications to administrators
      // 2. Update a notification system in your database
      // 3. Potentially trigger auto-ordering if implemented
      
      // Example code for sending email (commented out as it requires an email service):
      // await sendLowStockNotification(lowStockProducts);
    } else {
      console.log('✅ No low stock products found.');
    }
  } catch (error) {
    console.error('❌ Error in low stock inventory check:', error);
  }
}

/**
 * Initialize all cron jobs
 */
export function initCronJobs(): void {
  // Schedule low stock check to run every day at 6 AM
  const scheduleCheckLowStock = () => {
    const now = new Date();
    const sixAM = new Date();
    sixAM.setHours(6, 0, 0, 0);
    
    // If it's already past 6 AM, schedule for next day
    if (now > sixAM) {
      sixAM.setDate(sixAM.getDate() + 1);
    }
    
    const delay = sixAM.getTime() - now.getTime();
    
    // Schedule the job
    setTimeout(() => {
      checkLowStockInventory()
        .then(() => {
          // After execution, schedule the next run
          scheduleCheckLowStock();
        })
        .catch(error => {
          console.error('❌ Error in scheduled low stock check:', error);
          // Still schedule the next run even if there was an error
          scheduleCheckLowStock();
        });
    }, delay);
    
    console.log(`📅 Low stock check scheduled for ${sixAM.toLocaleString()}`);
  };
  
  // Initial schedule
  scheduleCheckLowStock();
  
  // For testing purposes, also run immediately when the server starts
  checkLowStockInventory().catch(error => {
    console.error('❌ Error in initial low stock check:', error);
  });
}

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled job to delete old invoices...');
  await deleteOldInvoices();
});