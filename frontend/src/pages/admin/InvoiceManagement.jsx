import React, { useState, useEffect } from 'react';
import { getInvoicesByUser } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchInvoices();
  }, [currentPage]);
  
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // In a real application, you would fetch all invoices for admin
      // This is a placeholder using the user-specific endpoint
      const response = await getInvoicesByUser('all');
      
      if (response.data.success) {
        setInvoices(response.data.invoices || []);
        setTotalPages(Math.ceil((response.data.invoices?.length || 0) / 10));
      } else {
        setError('Failed to load invoices');
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const viewInvoice = (invoiceId) => {
    window.open(`/invoice/${invoiceId}`, '_blank');
  };
  
  const columns = [
    { title: 'Invoice ID', field: 'invoiceId' },
    { 
      title: 'Date', 
      render: (row) => new Date(row.createdAt).toLocaleDateString() 
    },
    { 
      title: 'Order ID', 
      field: 'orderId'
    },
    { 
      title: 'Customer', 
      render: (row) => (
        <div>
          <p>{row.userDetails?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{row.userDetails?.email}</p>
        </div>
      )
    },
    { 
      title: 'Amount', 
      render: (row) => `₹${row.amount.toLocaleString()}` 
    },
    { 
      title: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full
          ${row.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {row.status}
        </span>
      )
    },
    { 
      title: 'Actions', 
      render: (row) => (
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => viewInvoice(row.invoiceId)}
          >
            View
          </Button>
        </div>
      )
    },
  ];
  
  if (loading && !invoices.length) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Manage customer invoices</p>
        </div>
      </div>
      
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Card>
        <Table
          columns={columns}
          data={invoices.slice((currentPage - 1) * 10, currentPage * 10)}
          loading={loading}
          emptyMessage="No invoices found"
        />
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};

export default InvoiceManagement;