import React, { useState, useContext, use } from 'react';
import axios from 'axios';
import {
  Dialog,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  CircularProgress
} from '@mui/material';
import { AuthProvider} from './AuthContext';
import { useNavigate } from 'react-router';

export default function LoginModal() {
  const { activeModal, setActiveModal } = useContext(AuthProvider);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate=useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('data is: ', formData);
      const response = await axios.post(
        'http://localhost:5000/user/login', 
        formData,
        {
          headers: { 'Accept': 'application/json' },
          withCredentials: true,
        }
      );
      
      if (response.data) {
        localStorage.setItem('authToken', response.data.token);
        setActiveModal(null);
        await new Promise(resolve => setTimeout(resolve, 50));
        navigate('/home');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={activeModal === 'login'} onClose={() => setActiveModal(null)}>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
