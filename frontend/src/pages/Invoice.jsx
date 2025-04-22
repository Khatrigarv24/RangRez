import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById, generateInvoice } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Loader from '../components/ui/Loader';

const Invoice = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await getOrderById(id);
        
        if (response.data.success) {
          setOrder(response.data.order);
        } else {
          setError('Failed to load order details');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();
  }, [id]);
  
  const handlePrintInvoice = () => {
    window.print();
  };
  
  const handleDownloadPDF = async () => {
    try {
      const response = await generateInvoice(id);
      
      if (response.data.success && response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
      } else {
        setError('Failed to generate invoice PDF');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate invoice PDF');
    }
  };
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Alert type="error">{error || 'Order not found'}</Alert>
        <div className="mt-8 text-center">
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex justify-between items-center print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
        <div className="flex space-x-4">
          <Button variant="secondary" onClick={handlePrintInvoice}>
            Print
          </Button>
          <Button onClick={handleDownloadPDF}>
            Download PDF
          </Button>
        </div>
      </div>
      
      <Card className="print:shadow-none print:border print:border-gray-200">
        {/* Invoice Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">RANGREZ</h2>
            <p className="text-gray-600 mt-1">
              123 Fashion Street<br />
              Style City, SC 12345<br />
              contact@rangrez.com<br />
              (123) 456-7890
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold">Invoice #{order.orderId}</h3>
            <p className="text-gray-600 mt-1">Date: {formattedDate}</p>
            <p className="text-gray-600">
              Status: <span className="font-medium capitalize">{order.status}</span>
            </p>
          </div>
        </div>
        
        {/* Customer Details */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
            <p className="text-gray-600">
              {order.shippingDetails.fullName}<br />
              {order.shippingDetails.address}<br />
              {order.shippingDetails.city}, {order.shippingDetails.state}<br />
              {order.shippingDetails.postalCode}<br />
              {order.shippingDetails.email}<br />
              {order.shippingDetails.mobile}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Payment Information:</h4>
            <p className="text-gray-600">
              Method: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}<br />
              {order.paymentStatus && `Status: ${order.paymentStatus}`}
            </p>
          </div>
        </div>
        
        {/* Order Items */}
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-4">Order Items</h4>
          <div className="overflow-hidden border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productName || `Product #${item.productId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="mt-8 flex justify-end">
          <div className="w-full md:w-1/2">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">₹{order.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">₹0.00</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">₹0.00</span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-200">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">₹{order.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-sm text-gray-600 text-center">
          <p>Thank you for shopping with Rangrez!</p>
          <p className="mt-1">For any questions, please contact our customer support.</p>
        </div>
      </Card>
      
      <div className="mt-8 text-center print:hidden">
        <Link to="/">
          <Button variant="secondary">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
};

export default Invoice;