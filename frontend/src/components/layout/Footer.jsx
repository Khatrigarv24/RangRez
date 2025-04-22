import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">RANGREZ</h3>
            <p className="text-gray-300 text-sm">
              Premium fabrics and clothing for all occasions. Quality you can feel, style you can see.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white text-sm">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white text-sm">Products</Link></li>
              <li><Link to="/cart" className="text-gray-300 hover:text-white text-sm">Cart</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <address className="text-gray-300 text-sm not-italic">
              <p>123 Fashion Street</p>
              <p>Style City, SC 12345</p>
              <p className="mt-2">Email: contact@rangrez.com</p>
              <p>Phone: (123) 456-7890</p>
            </address>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Rangrez. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;