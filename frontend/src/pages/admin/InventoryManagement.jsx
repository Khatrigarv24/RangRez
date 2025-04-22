import React, { useState, useEffect } from 'react';
import { getAllProductsAdmin, updateProduct } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState('');
  
  useEffect(() => {
    fetchProducts();
  }, [currentPage]);
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getAllProductsAdmin();
      
      if (response.data.success) {
        const allProducts = response.data.products || [];
        
        // Calculate total pages
        setTotalPages(Math.ceil(allProducts.length / itemsPerPage));
        
        // Get current page items
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setProducts(allProducts.slice(startIndex, endIndex));
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const openUpdateModal = (product) => {
    setSelectedProduct(product);
    setNewStock(product.stock.toString());
    setIsUpdateModalOpen(true);
  };
  
  const handleUpdateStock = async () => {
    try {
      setLoading(true);
      
      const stock = parseInt(newStock);
      if (isNaN(stock) || stock < 0) {
        setError('Please enter a valid stock quantity');
        return;
      }
      
      const response = await updateProduct(selectedProduct.id, { 
        ...selectedProduct,
        stock 
      });
      
      if (response.data.success) {
        setSuccess('Stock updated successfully');
        setIsUpdateModalOpen(false);
        
        // Update the product in the list
        setProducts(products.map(product => 
          product.id === selectedProduct.id 
            ? { ...product, stock } 
            : product
        ));
      } else {
        setError(response.data.error || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Failed to update stock. Please try again.');
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
    { 
      title: 'Image', 
      render: (row) => (
        <div className="w-16 h-16">
          {row.imageUrls?.[0] ? (
            <img
              src={row.imageUrls[0]}
              alt={row.name}
              className="h-full w-full object-cover rounded"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 rounded flex items-center justify-center text-gray-500">
              N/A
            </div>
          )}
        </div>
      )
    },
    { title: 'Name', field: 'name' },
    { title: 'SKU', field: 'id' },
    { 
      title: 'Stock', 
      render: (row) => (
        <span className={`font-medium ${
          row.stock === 0 ? 'text-red-600' : 
          row.stock < 10 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {row.stock}
        </span>
      )
    },
    { 
      title: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.stock === 0 ? 'bg-red-100 text-red-800' : 
          row.stock < 10 ? 'bg-yellow-100 text-yellow-800' : 
          'bg-green-100 text-green-800'
        }`}>
          {row.stock === 0 ? 'Out of Stock' : 
           row.stock < 10 ? 'Low Stock' : 
           'In Stock'}
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
          Update Stock
        </Button>
      )
    },
  ];
  
  if (loading && !products.length) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage product stock levels</p>
        </div>
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
          data={products}
          loading={loading}
          emptyMessage="No products found"
          sortable
          initialSortField="stock"
          initialSortDirection="asc"
        />
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>
      
      {/* Update Stock Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Stock"
        size="sm"
      >
        <div className="py-3">
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Product:</p>
                <p className="text-gray-900">{selectedProduct.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Current Stock:</p>
                <p className="text-gray-900">{selectedProduct.stock}</p>
              </div>
              
              <Input
                label="New Stock Quantity"
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                min="0"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateStock}>
                  Update Stock
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;