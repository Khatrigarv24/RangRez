import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Alert from '../components/ui/Alert';
import Loader from '../components/ui/Loader';

const Checkout = () => {
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    address: '',
    city: '',
    postalCode: '',
    state: '',
    paymentMethod: 'cod'
  });
  
  // Redirect if cart is empty or user is not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, user, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple validation
    if (!formData.fullName || !formData.email || !formData.mobile || !formData.address || !formData.city || 
        !formData.postalCode || !formData.state) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      const orderData = {
        userId: user.userId,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.productDetails.price
        })),
        shippingDetails: {
          fullName: formData.fullName,
          email: formData.email,
          mobile: formData.mobile,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          state: formData.state
        },
        paymentMethod: formData.paymentMethod,
        amount: cartTotal
      };
      
      const response = await createOrder(orderData);
      
      if (response.data.success) {
        const orderId = response.data.order.orderId;
        
        try {
          await clearCart();
        } catch (clearCartError) {
          console.warn("Failed to clear cart, but order was placed:", clearCartError);
        }
        
        navigate(`/invoice/${orderId}`);
      } else {
        setError(response.data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
      
      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card title="Shipping Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Postal Code"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
                <div className="md:col-span-2">
                  <TextArea
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                  />
                </div>
              </div>
            </Card>
            
            <Card title="Payment Method" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="cod"
                    name="paymentMethod"
                    value="cod"
                    type="radio"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="cod" className="ml-3 block text-sm font-medium text-gray-700">
                    Cash on Delivery
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="online"
                    name="paymentMethod"
                    value="online"
                    type="radio"
                    checked={formData.paymentMethod === 'online'}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="online" className="ml-3 block text-sm font-medium text-gray-700">
                    Online Payment (Credit Card / UPI)
                  </label>
                </div>
              </div>
            </Card>
            
            <div className="mt-6">
              <Button type="submit" fullWidth>
                Place Order
              </Button>
            </div>
          </form>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card title="Order Summary" className="sticky top-4">
            <div className="divide-y divide-gray-200">
              {cartItems.map((item) => (
                <div key={item.productId} className="py-3 flex justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.productDetails?.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    ₹{((item.productDetails?.price || 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              
              <div className="py-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Shipping</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Tax</span>
                  <span>₹0.00</span>
                </div>
              </div>
              
              <div className="py-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;