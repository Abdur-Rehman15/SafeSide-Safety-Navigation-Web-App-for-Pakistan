import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Select,
  MenuItem,
  Slider,
  Typography,
  CircularProgress,
  Box,
  Paper
} from '@mui/material';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';

export default function CrimeReportForm() {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    typeOfCrime: 'theft',
    severity: 1,
    comments: ''
  });
  const navigate=useNavigate();

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude
        });
        setLoading(false);
        setLocationError('');
      },
      (error) => {
        setLocationError('Please enable location services to report a crime');
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');

    try {
      const response = await axios.post('http://localhost:5000/report/submit-report', {
        ...formData,
        longitude: 74.244000,
        latitude: 31.390900,
        votes: {
          upvotes: [],
          downvotes: [],
          score: 0
        }
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          withCredentials: true
        }
      });

      setFormData({
        typeOfCrime: 'theft',
        severity: 1,
        comments: ''
      })
      alert('Report registered successfully');
      navigate('/home');
    
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Report a Crime
        </Typography>

        {loading && !location ? (
          <Box textAlign="center" my={4}>
            <CircularProgress />
            <Typography>Getting your location...</Typography>
          </Box>
        ) : locationError ? (
          <Box textAlign="center" my={4}>
            <Typography color="error">{locationError}</Typography>
            <Button variant="contained" onClick={getLocation} sx={{ mt: 2 }}>
              Try Again
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Select
              fullWidth
              value={formData.typeOfCrime}
              onChange={(e) => setFormData({ ...formData, typeOfCrime: e.target.value })}
              required
              sx={{ mb: 3 }}
            >
              <MenuItem value="theft">Theft</MenuItem>
              <MenuItem value="robbery">Robbery</MenuItem>
              <MenuItem value="harassment">Harassment</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>

            <Typography gutterBottom>Severity: {formData.severity}</Typography>
            <Slider
              value={formData.severity}
              onChange={(e, value) => setFormData({ ...formData, severity: value })}
              min={1}
              max={5}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              multiline
              rows={4}
              margin="normal"
              label="Comments (Optional)"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              inputProps={{ maxLength: 500 }}
            />

            {location && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Location: {location.longitude.toFixed(4)}, {location.latitude.toFixed(4)}
              </Typography>
            )}

            {submitError && (
              <Typography color="error" sx={{ mt: 2 }}>
                {submitError}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !location}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Report'}
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}
