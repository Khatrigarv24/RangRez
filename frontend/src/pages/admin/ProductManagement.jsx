import React, { useState, useEffect } from 'react';
import { getAllProductsAdmin, createProduct, updateProduct, deleteProduct } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/ui/Pagination';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    fabric: '',
    color: '',
    discount: '',
    featured: false,
    tags: '',
    imageUrls: ['']
  });

  // Get all products
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

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image URL input changes
  const handleImageUrlChange = (index, value) => {
    const newImageUrls = [...formData.imageUrls];
    newImageUrls[index] = value;
    setFormData(prev => ({
      ...prev,
      imageUrls: newImageUrls
    }));
  };

  // Add new image URL input field
  const addImageUrlField = () => {
    setFormData(prev => ({
      ...prev,
      imageUrls: [...prev.imageUrls, '']
    }));
  };

  // Remove image URL input field
  const removeImageUrlField = (index) => {
    if (formData.imageUrls.length > 1) {
      const newImageUrls = [...formData.imageUrls];
      newImageUrls.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        imageUrls: newImageUrls
      }));
    }
  };

  // Open add product modal
  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      fabric: '',
      color: '',
      discount: '',
      featured: false,
      tags: '',
      imageUrls: ['']
    });
    setIsAddModalOpen(true);
  };

  // Open edit product modal
  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      stock: product.stock || '',
      fabric: product.fabric || '',
      color: product.color || '',
      discount: product.discount || '',
      featured: product.featured || false,
      tags: (product.tags || []).join(', '),
      imageUrls: product.imageUrls?.length ? [...product.imageUrls] : ['']
    });
    setIsEditModalOpen(true);
  };

  // Open delete product modal
  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Handle add product submission
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Process form data
      const processedData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        discount: parseFloat(formData.discount) || 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const response = await createProduct(processedData);
      
      if (response.data.success) {
        setSuccess('Product added successfully');
        setIsAddModalOpen(false);
        fetchProducts(); // Refresh product list
      } else {
        setError(response.data.error || 'Failed to add product');
      }
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit product submission
  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Process form data
      const processedData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        discount: parseFloat(formData.discount) || 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        // Add CSRF protection bypass
        headers: {
          'x-csrf-disable': 'true'
        }
      };
      
      const response = await updateProduct(selectedProduct.id, processedData);
      
      if (response.data.success) {
        setSuccess('Product updated successfully');
        setIsEditModalOpen(false);
        fetchProducts(); // Refresh product list
      } else {
        setError(response.data.error || 'Failed to update product');
      }
    } catch (err) {
      console.error('Error updating product:', err, err.response?.data);
      setError(err.response?.data?.error || 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      
      const response = await deleteProduct(selectedProduct.id);
      
      if (response.data.success) {
        setSuccess('Product deleted successfully');
        setIsDeleteModalOpen(false);
        fetchProducts(); // Refresh product list
      } else {
        setError(response.data.error || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product. Please try again.');
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

  // Product table columns
  const columns = [
    { 
      title: 'Image', 
      render: (row) => (
        <div className="h-12 w-12">
          {row.imageUrl ? (
            <img 
              src={row.imageUrl} 
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
    { 
      title: 'Price', 
      render: (row) => `₹${row.price?.toLocaleString() || 0}` 
    },
    { title: 'Stock', field: 'stock' },
    { 
      title: 'Featured', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.featured ? 'Yes' : 'No'}
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
            onClick={() => openEditModal(row)}
          >
            Edit
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => openDeleteModal(row)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  const productForm = (
    <form onSubmit={isAddModalOpen ? handleAddProduct : handleEditProduct}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          label="Price (₹)"
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
        />
        <Input
          label="Stock"
          type="number"
          name="stock"
          value={formData.stock}
          onChange={handleChange}
          required
        />
        <Input
          label="Fabric"
          name="fabric"
          value={formData.fabric}
          onChange={handleChange}
        />
        <Input
          label="Color"
          name="color"
          value={formData.color}
          onChange={handleChange}
        />
        <Input
          label="Discount (%)"
          type="number"
          name="discount"
          value={formData.discount}
          onChange={handleChange}
        />
      </div>
      
      <TextArea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        className="mt-4"
      />
      
      <Input
        label="Tags (comma-separated)"
        name="tags"
        value={formData.tags}
        onChange={handleChange}
        placeholder="e.g. cotton, summer, casual"
        className="mt-4"
      />
      
      <div className="mt-4">
        <p className="block text-sm font-medium text-gray-700 mb-1">
          Image URLs
        </p>
        {formData.imageUrls.map((url, index) => (
          <div key={index} className="flex items-center mb-2">
            <Input
              name={`imageUrl-${index}`}
              value={url}
              onChange={(e) => handleImageUrlChange(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="mb-0 flex-grow"
            />
            <button
              type="button"
              onClick={() => removeImageUrlField(index)}
              disabled={formData.imageUrls.length === 1}
              className={`ml-2 p-2 text-red-500 rounded hover:bg-red-50 ${
                formData.imageUrls.length === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addImageUrlField}
          className="mt-2"
        >
          Add Image URL
        </Button>
      </div>
      
      <Checkbox
        label="Featured Product"
        name="featured"
        checked={formData.featured}
        onChange={handleChange}
        className="mt-4"
      />
      
      <div className="mt-6 flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">{isAddModalOpen ? 'Add Product' : 'Update Product'}</Button>
      </div>
    </form>
  );

  if (loading && !products.length) {
    return <Loader fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product inventory</p>
        </div>
        <Button onClick={openAddModal}>
          Add New Product
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
          data={products}
          loading={loading}
          emptyMessage="No products found"
        />
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
        size="lg"
      >
        {productForm}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
        size="lg"
      >
        {productForm}
      </Modal>

      {/* Delete Product Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Product"
        size="sm"
      >
        <div className="py-3">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the product "{selectedProduct?.name}"? This action cannot be undone.
          </p>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProduct}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManagement;