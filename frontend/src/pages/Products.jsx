import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import Pagination from '../components/ui/Pagination';

const Products = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    color: searchParams.get('color') || '',
    fabric: searchParams.get('fabric') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    category: searchParams.get('category') || ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, filters]);

  useEffect(() => {
    // Update filters when URL search params change
    const category = searchParams.get('category');
    if (category) {
      setFilters(prev => ({...prev, category}));
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts({
        ...filters,
        page: currentPage
      });

      if (response.data.success) {
        setProducts(response.data.products);
        setTotalPages(response.data.totalPages || 1);
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name]: value}));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      color: '',
      fabric: '',
      minPrice: '',
      maxPrice: '',
      category: ''
    });
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Our Products</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters - Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <div className="space-y-6">
              <h2 className="font-medium text-lg">Filters</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <select
                  name="color"
                  value={filters.color}
                  onChange={handleFilterChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Colors</option>
                  <option value="red">Red</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="black">Black</option>
                  <option value="white">White</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabric</label>
                <select
                  name="fabric"
                  value={filters.fabric}
                  onChange={handleFilterChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Fabrics</option>
                  <option value="cotton">Cotton</option>
                  <option value="silk">Silk</option>
                  <option value="linen">Linen</option>
                  <option value="wool">Wool</option>
                  <option value="polyester">Polyester</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      name="minPrice"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      name="maxPrice"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Button variant="secondary" size="sm" onClick={clearFilters} fullWidth>
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Products Grid */}
        <div className="lg:col-span-3">
          {loading && <Loader />}
          
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>}
          
          {!loading && !error && (
            <>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No products found matching your criteria.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <Link key={product.id} to={`/products/${product.id}`}>
                        <Card className="h-full transform transition-transform hover:scale-105">
                          <div className="h-48 bg-gray-200">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{product.fabric} {product.color && `• ${product.color}`}</p>
                            <div className="flex justify-between items-center">
                              {product.discount > 0 ? (
                                <div>
                                  <p className="text-lg font-bold text-indigo-600">
                                    ₹{((product.price * (100 - product.discount)) / 100).toFixed(2)}
                                  </p>
                                  <p className="text-sm text-gray-500 line-through">₹{product.price.toFixed(2)}</p>
                                </div>
                              ) : (
                                <p className="text-lg font-bold text-indigo-600">₹{product.price.toFixed(2)}</p>
                              )}
                              {product.featured && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;