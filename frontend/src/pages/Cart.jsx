import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Loader from '../components/ui/Loader';

const Cart = () => {
  const { cartItems, cartTotal, removeFromCart, clearCart, loading, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only refresh once when the component mounts
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means it only runs once
  
  const handleRemoveItem = async (productId) => {
    await removeFromCart(productId);
  };
  
  const handleCheckout = () => {
    navigate('/checkout');
  };
  
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Alert type="error">
          Please <Link to="/login" className="font-medium underline">login</Link> to view your cart
        </Alert>
      </div>
    );
  }
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <Card className="text-center py-12">
          <div className="space-y-4">
            <p className="text-lg text-gray-600">Your cart is empty</p>
            <Link to="/products">
              <Button>Browse Products</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card noPadding>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cartItems.map((item) => {
                      const product = item.productDetails;
                      const itemTotal = (product?.price * item.quantity) || 0;
                      
                      return (
                        <tr key={item.productId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-16 w-16 flex-shrink-0 bg-gray-200 rounded">
                                {product?.imageUrl && (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="h-full w-full object-cover rounded" 
                                  />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  <Link to={`/products/${item.productId}`} className="hover:text-indigo-600">
                                    {product?.name || 'Product'}
                                  </Link>
                                </div>
                                {product?.fabric && (
                                  <div className="text-sm text-gray-500">
                                    {product.fabric} {product.color && `• ${product.color}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{product?.price.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{itemTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card title="Order Summary" className="sticky top-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST(18%)</span>
                  <span className="font-medium">₹{(cartTotal * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">₹0.00</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  {/* Add GST to total */}
                  <span className="text-lg font-bold">₹{(cartTotal + (cartTotal * 0.18)).toFixed(2)}</span>
                </div>
                
                <Button 
                  onClick={handleCheckout} 
                  fullWidth
                  disabled={cartItems.length === 0}
                >
                  Proceed to Checkout
                </Button>
                
                <Button 
                  variant="secondary" 
                  fullWidth
                  disabled={cartItems.length === 0}
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;