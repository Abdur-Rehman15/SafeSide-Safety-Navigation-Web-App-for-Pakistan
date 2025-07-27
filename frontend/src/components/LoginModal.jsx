import React, { useState } from 'react';
import {
  Dialog,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  CircularProgress
} from '@mui/material';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';

export default function LoginModal() {
  const { login, activeModal, setActiveModal } = useAuth();
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
      const success = await login(formData);
      if (success) {
        setActiveModal(null);
        navigate('/home'); 
      } else {
        setError('Login failed');
      }
    } catch (err) {

      console.log('an error occured during login: ', err);
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
