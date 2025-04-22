import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById } from '../services/api';
import { useCart } from '../context/CartContext';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useCart();
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await getProductById(id);
        
        if (response.data.success) {
          setProduct(response.data.product);
        } else {
          setError('Failed to load product details');
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id]);
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= (product?.stock || 10)) {
      setQuantity(value);
    }
  };
  
  const incrementQuantity = () => {
    if (quantity < (product?.stock || 10)) {
      setQuantity(quantity + 1);
    }
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };
  
  const handleAddToCart = async () => {
    if (!product) return;
    
    const success = await addToCart(product.id, quantity);
    if (success) {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    }
  };
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Alert type="error">{error || 'Product not found'}</Alert>
        <div className="mt-8 text-center">
          <Link to="/products">
            <Button>Return to Products</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Calculate final price with discount
  const finalPrice = product.discount 
    ? (product.price * (100 - product.discount) / 100).toFixed(2)
    : product.price.toFixed(2);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {addedToCart && (
        <Alert type="success" onClose={() => setAddedToCart(false)}>
          Product added to cart!
        </Alert>
      )}
      
      <div className="mb-6">
        <Link to="/products" className="text-indigo-600 hover:text-indigo-800 flex items-center">
          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Products
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <div className="bg-gray-200 rounded-lg overflow-hidden mb-4 h-96">
            <img 
              src={product.imageUrls?.[activeImage] || product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover" 
            />
          </div>
          
          {product.imageUrls && product.imageUrls.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.imageUrls.map((url, index) => (
                <div 
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`w-24 h-24 bg-gray-200 rounded cursor-pointer border-2 ${activeImage === index ? 'border-indigo-600' : 'border-transparent'}`}
                >
                  <img 
                    src={url} 
                    alt={`${product.name} view ${index+1}`}
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          
          <div className="flex items-center space-x-2 mb-4">
            {product.featured && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Featured
              </span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
            </span>
          </div>
          
          <div className="mb-6">
            {product.discount > 0 ? (
              <div className="flex items-center">
                <p className="text-3xl font-bold text-indigo-600 mr-3">₹{finalPrice}</p>
                <p className="text-lg text-gray-500 line-through">₹{product.price.toFixed(2)}</p>
                <span className="ml-3 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {product.discount}% OFF
                </span>
              </div>
            ) : (
              <p className="text-3xl font-bold text-indigo-600">₹{finalPrice}</p>
            )}
          </div>
          
          <div className="border-t border-gray-200 py-4">
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-2">Details</h2>
              <p className="text-gray-600">{product.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.fabric && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Fabric</h3>
                  <p className="text-gray-600">{product.fabric}</p>
                </div>
              )}
              
              {product.color && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Color</h3>
                  <p className="text-gray-600">{product.color}</p>
                </div>
              )}
            </div>
            
            {product.tags && product.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {product.stock > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quantity</h3>
              <div className="flex items-center">
                <button 
                  onClick={decrementQuantity}
                  className="p-2 border border-gray-300 rounded-l"
                >
                  <svg className="w-4 h-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  max={product.stock}
                  className="w-16 border-t border-b border-gray-300 text-center"
                />
                <button 
                  onClick={incrementQuantity}
                  className="p-2 border border-gray-300 rounded-r"
                >
                  <svg className="w-4 h-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              fullWidth
            >
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Related products section could be added here */}
    </div>
  );
};

export default ProductDetail;