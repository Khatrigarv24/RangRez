import React, { useState, useEffect } from 'react';
import { getAllOrdersAdmin, updateOrderStatus } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  useEffect(() => {
    fetchOrders();
  }, [currentPage]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getAllOrdersAdmin({ page: currentPage, limit: 10 });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const openUpdateModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsUpdateModalOpen(true);
  };
  
  const handleUpdateOrderStatus = async () => {
    try {
      setLoading(true);
      // Only send the status field in a clean object to avoid DynamoDB errors
      const response = await updateOrderStatus(selectedOrder.orderId, { 
        status: newStatus,
        paymentStatus: newStatus 
      });
      
      if (response.data.success) {
        setSuccess('Order status updated successfully');
        setIsUpdateModalOpen(false);
        
        // Update the order in the list
        setOrders(orders.map(order => 
          order.orderId === selectedOrder.orderId 
            ? { ...order, status: newStatus, paymentStatus: newStatus } 
            : order
         ));
        
        // Refresh data to ensure we have the latest state
        fetchOrders();
      } else {
        setError(response.data.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  const columns = [
    { title: 'Order ID', field: 'orderId' },
    { 
      title: 'Date', 
      render: (row) => new Date(row.createdAt).toLocaleDateString() 
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
      render: (row) => row.amount ? `₹${row.amount.toLocaleString()}` : '₹0.00' 
    },
    { 
      title: 'Items', 
      render: (row) => (row.items && Array.isArray(row.items) ? row.items.length : 0)
    },
    { 
      title: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full
          ${row.status === 'completed' ? 'bg-green-100 text-green-800' : 
          row.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
          row.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
          'bg-yellow-100 text-yellow-800'}`}>
          {row.status}
        </span>
      )
    },
    { 
      title: 'Actions', 
      render: (row) => (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => openUpdateModal(row)}
        >
          Update Status
        </Button>
      )
    },
  ];
  
  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' }
  ];
  
  if (loading && !orders.length) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage customer orders</p>
        </div>
        <Button 
          variant="secondary"
          onClick={() => fetchOrders()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </div>
      
      {success && (
        <Alert type="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Card>
        <Table
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage="No orders found"
        />
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>
      
      {/* Update Status Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Order Status"
        size="sm"
      >
        <div className="py-3">
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Order ID:</p>
                <p className="text-gray-900">{selectedOrder.orderId}</p>
              </div>
              
              <Select
                label="Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={statusOptions}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateOrderStatus}>
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default OrderManagement;