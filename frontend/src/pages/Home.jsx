import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero section */}
      <div className="relative bg-indigo-700 rounded-2xl overflow-hidden mb-12">
        <div className="absolute inset-0 opacity-20 bg-pattern"></div>
        <div className="relative max-w-3xl mx-auto px-6 py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
            Exceptional Fabrics for Exceptional Style
          </h1>
          <p className="mt-6 text-xl text-indigo-100 max-w-2xl mx-auto">
            Discover our collection of premium fabrics and clothing designed for comfort, style, and durability.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/products">
              <Button size="lg">
                Explore Collection
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured categories */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Shop By Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {['Casual Wear', 'Formal Wear', 'Traditional Wear'].map((category, index) => (
            <Card key={index} className="transform transition-transform hover:scale-105">
              <div className="h-64 bg-gray-200 flex items-center justify-center">
                <p className="text-xl font-medium text-gray-900">{category}</p>
              </div>
              <div className="p-4 text-center">
                <Link to={`/products?category=${category.toLowerCase().replace(' ', '-')}`}>
                  <Button variant="secondary" fullWidth>
                    View {category}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured products */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="transform transition-transform hover:scale-105">
              <div className="h-64 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900">Product Name</h3>
                <p className="text-sm text-gray-500 mb-2">Premium Fabric</p>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-indigo-600">₹1,499</p>
                  <Button size="sm">Add to Cart</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "Priya S.",
              text: "The quality of fabrics from Rangrez is exceptional. I've been a loyal customer for years."
            },
            {
              name: "Rahul M.",
              text: "Fantastic selection and amazing customer service. My go-to place for all my clothing needs."
            },
            {
              name: "Anita K.",
              text: "Beautiful traditional wear with modern designs. Always receive compliments when I wear Rangrez."
            }
          ].map((testimonial, index) => (
            <Card key={index} className="text-center">
              <div className="p-6">
                <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                <p className="font-medium text-gray-900">{testimonial.name}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-gray-100 rounded-lg p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to Our Newsletter</h2>
          <p className="text-gray-600 mb-6">Stay updated with our latest products and offers.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <Button>Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;