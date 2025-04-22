import React, { useState, useEffect } from 'react';
import { getAllUsersAdmin, updateUserAdmin } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Alert from '../../components/ui/Alert';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Checkbox from '../../components/ui/Checkbox';
import Pagination from '../../components/ui/Pagination';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    isB2B: false,
    gstNumber: '',
    isBlocked: false
  });
  
  useEffect(() => {
    fetchUsers();
  }, [currentPage]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsersAdmin({ page: currentPage, limit: 10 });
      
      if (response.data.success) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Open edit user modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      isB2B: user.isB2B || false,
      gstNumber: user.gstNumber || '',
      isBlocked: user.isBlocked || false
    });
    setIsEditModalOpen(true);
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle edit user submission
  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const response = await updateUserAdmin(selectedUser.userId, formData);
      
      if (response.data.success) {
        setSuccess('User updated successfully');
        setIsEditModalOpen(false);
        
        // Update the user in the list
        setUsers(users.map(user => 
          user.userId === selectedUser.userId 
            ? { ...user, ...formData } 
            : user
        ));
      } else {
        setError(response.data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
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
      title: 'User', 
      render: (row) => (
        <div>
          <p className="font-medium">{row.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      )
    },
    { title: 'Mobile', field: 'mobile' },
    { 
      title: 'Type', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full
          ${row.isB2B ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {row.isB2B ? 'B2B' : 'B2C'}
        </span>
      )
    },
    { 
      title: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full
          ${row.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {row.isBlocked ? 'Blocked' : 'Active'}
        </span>
      )
    },
    { title: 'Orders', field: 'orderCount' },
    { 
      title: 'Joined On', 
      render: (row) => new Date(row.createdAt).toLocaleDateString() 
    },
    { 
      title: 'Actions', 
      render: (row) => (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => openEditModal(row)}
        >
          Edit
        </Button>
      )
    },
  ];
  
  if (loading && !users.length) {
    return <Loader fullScreen />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user accounts</p>
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
          data={users}
          loading={loading}
          emptyMessage="No users found"
        />
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </Card>
      
      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        size="md"
      >
        <form onSubmit={handleEditUser}>
          <div className="space-y-4">
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            
            <Checkbox
              label="B2B Account"
              name="isB2B"
              checked={formData.isB2B}
              onChange={handleChange}
            />
            
            {formData.isB2B && (
              <Input
                label="GST Number"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
              />
            )}
            
            <Checkbox
              label="Block User"
              name="isBlocked"
              checked={formData.isBlocked}
              onChange={handleChange}
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update User
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;