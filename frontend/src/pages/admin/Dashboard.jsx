import React, { useState, useEffect } from 'react';
import { getDashboardAnalytics, getLowStockInventory } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';

const DashboardCard = ({ title, value, icon, trend, trendValue, className }) => {
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';
  const trendIcon = trend === 'up' ? '↑' : '↓';

  return (
    <Card className={`${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {(trend && trendValue) && (
            <p className={`mt-1 text-sm ${trendColor} flex items-center`}>
              <span>{trendIcon}</span>
              <span className="ml-1">{trendValue}%</span>
              <span className="ml-1 text-gray-500">from last month</span>
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-100 rounded-full">
          {icon}
        </div>
      </div>
    </Card>
  );
};

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get analytics data
        const analyticsResponse = await getDashboardAnalytics();
        console.log('Analytics response:', analyticsResponse); // Debug log
        
        if (analyticsResponse.data && analyticsResponse.data.success) {
          const data = analyticsResponse.data.analytics;
          // Process the data into a format the dashboard can use
          const processedData = {
            totalSales: data.revenue.total || 0,
            salesGrowth: calculateGrowth(data.revenue.thisMonth, data.revenue.total),
            totalOrders: data.orders.total || 0,
            ordersGrowth: calculateGrowth(data.orders.thisMonth, data.orders.total),
            totalCustomers: data.users.total || 0,
            customersGrowth: calculateGrowth(data.users.active, data.users.total),
            totalProducts: data.bestSellingProducts?.length || 0,
            recentOrders: formatRecentOrders(data.orders, data.ordersByStatus),
            topProducts: formatTopProducts(data.bestSellingProducts)
          };
          
          setAnalytics(processedData);
        } else {
          setError('Failed to load analytics data');
        }
        
        // Get low stock inventory
        const lowStockResponse = await getLowStockInventory();
        
        if (lowStockResponse.data && lowStockResponse.data.success) {
          setLowStock(lowStockResponse.data.lowStockProducts || []);
        } else {
          console.error('Low stock data fetch failed:', lowStockResponse);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to calculate growth percentage
  const calculateGrowth = (current, total) => {
    if (!total || total === 0) return 0;
    const growth = (current / total) * 100;
    return Math.round(growth);
  };

  // Format recent orders from analytics data
  const formatRecentOrders = (orders, statusData) => {
    // Create dummy orders if needed for testing
    return Array.isArray(orders.recent) ? orders.recent : [];
  };

  // Format top selling products
  const formatTopProducts = (products) => {
    if (!products || !Array.isArray(products)) return [];
    
    // Get the total quantity sold across all products
    const totalSold = products.reduce((sum, product) => sum + (product.totalQuantity || 0), 0);
    
    // Calculate percentage for each product
    return products.map(product => ({
      name: product.name || 'Unknown Product',
      percentage: totalSold > 0 ? Math.round((product.totalQuantity / totalSold) * 100) : 0
    })).slice(0, 5); // Take top 5
  };

  const lowStockColumns = [
    { title: 'Product Name', field: 'name' },
    { 
      title: 'Current Stock', 
      field: 'stock',
      cellClassName: 'font-medium',
      render: (row) => (
        <span className={`font-medium ${row.stock < 5 ? 'text-red-600' : 'text-yellow-600'}`}>
          {row.stock}
        </span>
      )
    },
    { title: 'SKU', field: 'id' },
    { 
      title: 'Category', 
      field: 'category',
      render: (row) => row.category || 'Uncategorized'
    },
    { 
      title: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full
          ${row.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          {row.stock > 0 ? 'Low Stock' : 'Out of Stock'}
        </span>
      )
    },
  ];

  if (loading) {
    return <Loader fullScreen text="Loading dashboard data..." showText />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your business metrics</p>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Sales"
          value={analytics?.totalSales ? `₹${analytics.totalSales.toLocaleString()}` : '₹0'}
          icon={<svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend="up"
          trendValue={analytics?.salesGrowth || 0}
        />
        <DashboardCard
          title="Total Orders"
          value={analytics?.totalOrders || 0}
          icon={<svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          trend="up"
          trendValue={analytics?.ordersGrowth || 0}
        />
        <DashboardCard
          title="Total Customers"
          value={analytics?.totalCustomers || 0}
          icon={<svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          trend="up"
          trendValue={analytics?.customersGrowth || 0}
        />
        <DashboardCard
          title="Products in Stock"
          value={analytics?.totalProducts || 0}
          icon={<svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
      </div>

      <div className="mt-8">
        <Card title="Inventory Alert - Low Stock Items">
          {lowStock.length > 0 ? (
            <Table 
              columns={lowStockColumns} 
              data={lowStock}
              emptyMessage="No low stock items at the moment."
              striped
            />
          ) : (
            <p className="text-sm text-gray-500 py-4">No low stock items at the moment.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Order Status Overview">
          <div className="space-y-4">
            {analytics?.ordersByStatus ? (
              <div className="flex flex-wrap gap-4">
                {Object.entries(analytics.ordersByStatus || {}).map(([status, count]) => (
                  <div key={status} className="bg-white p-3 rounded-lg shadow border flex-1 min-w-[120px]">
                    <h4 className="text-sm text-gray-500 capitalize">{status}</h4>
                    <p className="text-xl font-semibold mt-1">{count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">No order status data available.</p>
            )}
          </div>
        </Card>
        
        <Card title="Revenue Breakdown">
          <div className="space-y-4">
            {analytics?.topProducts?.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Top Selling Products</h4>
                {analytics.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <p className="text-sm truncate flex-1">{product.name}</p>
                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${product.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm font-medium text-gray-900 w-16 text-right">
                      {product.percentage}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No sales data to display.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;