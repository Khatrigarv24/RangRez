import cron from 'node-cron';
import { deleteOldInvoices } from './invoice/invoice-controller';

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled job to delete old invoices...');
  await deleteOldInvoices();
});