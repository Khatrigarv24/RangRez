import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load cart items when user changes
  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      setCartItems([]);
    }
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/cart/${user.userId}`);
      
      if (response.data.success) {
        setCartItems(response.data.cartItems || []);
      }
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast.error('Failed to load your cart');
      // Add this line to make sure loading stops even if there's an error
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return false;
    }
    
    try {
      setLoading(true);
      const response = await api.post('/cart/add', {
        userId: user.userId,
        productId,
        quantity
      });
      
      if (response.data.success) {
        toast.success('Product added to cart');
        await fetchCartItems();
        return true;
      } else {
        toast.error(response.data.error || 'Failed to add to cart');
        return false;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.error || 'Failed to add to cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const response = await api.delete(`/cart/${user.userId}/${productId}`);
      
      if (response.data.success) {
        toast.success('Item removed from cart');
        await fetchCartItems();
        return true;
      } else {
        toast.error(response.data.error || 'Failed to remove item');
        return false;
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const response = await api.delete(`/cart/${user.userId}`, {
        headers: {
          'x-csrf-disable': 'true'  // Add this header
        }
      });
      
      if (response.data.success) {
        toast.success('Cart cleared');
        setCartItems([]);
        return true;
      } else {
        toast.error(response.data.error || 'Failed to clear cart');
        return false;
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemQuantity = async (productId, quantity) => {
    if (!user) return false;

    try {
      setLoading(true);
      const response = await api.put('/cart/update', {
        userId: user.userId,
        productId,
        quantity
      });

      if (response.data.success) {
        toast.success('Cart item updated');
        await fetchCartItems();
        return true;
      } else {
        toast.error(response.data.error || 'Failed to update item');
        return false;
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast.error('Failed to update item');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ 
      cartItems,
      cartTotal: cartItems.reduce((total, item) => 
        total + ((item.productDetails?.price || 0) * item.quantity), 0),
      cartCount: cartItems.reduce((count, item) => count + item.quantity, 0),
      loading,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      refreshCart: fetchCartItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);