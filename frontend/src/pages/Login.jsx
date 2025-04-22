import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';

const Login = () => {
  const [formData, setFormData] = useState({
    emailOrMobile: '',
    password: '',
  });
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.emailOrMobile || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      const success = await login(formData.emailOrMobile, formData.password);
      if (success) {
        navigate('/');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };
  
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <Card>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Log In to Your Account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email or Mobile"
            name="emailOrMobile"
            value={formData.emailOrMobile}
            onChange={handleChange}
            required
            placeholder="Enter your email or mobile number"
          />
          
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
          />
          
          <div className="text-right">
            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </a>
          </div>
          
          <Button type="submit" fullWidth>
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;