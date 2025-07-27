import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Slider,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Grid,
  useTheme,
  styled,
  InputAdornment,
  IconButton
} from '@mui/material';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';
import {
  Report as ReportIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

const REPORT_URL = import.meta.env.VITE_REPORT_URL;

const CompactCard = styled(Card)(({ selected }) => ({
  cursor: 'pointer',
  border: `2px solid ${selected ? '#6A1B9A' : '#E0E0E0'}`,
  backgroundColor: selected ? '#F3E5F5' : 'transparent',
  transition: 'all 0.2s ease',
  height: '100%',
  '&:hover': {
    borderColor: '#6A1B9A',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.1)'
  }
}));

const SeverityIndicator = styled(Box)(({ severity }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: 
    severity === 1 ? '#E1BEE7' :
    severity === 2 ? '#CE93D8' :
    severity === 3 ? '#FFCC80' :
    severity === 4 ? '#FFB74D' : '#F44336',
  border: '2px solid white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '0.7rem'
}));

const crimeTypeColors = {
  theft: '#CE93D8',
  robbery: '#FFB74D',
  harassment: '#9575CD',
  other: '#A1887F'
};

export default function CrimeReportForm() {
  const theme = useTheme();
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    typeOfCrime: 'theft',
    severity: 1,
    comments: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
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
        setLocationError('Enable location to report');
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');

    try {
      await axios.post(`${REPORT_URL}/submit-report`, {
        ...formData,
        longitude: location.longitude,
        latitude: location.latitude,
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

      setSuccess(true);
      setTimeout(() => navigate('/home'), 1500);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const crimeTypes = [
    { value: 'theft', label: 'Theft' },
    { value: 'robbery', label: 'Robbery' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'other', label: 'Other' }
  ];

  if (success) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '70vh',
        textAlign: 'center',
        px: 2,
        backgroundColor: '#F3E5F5'
      }}>
        <SuccessIcon sx={{ fontSize: 60, color: '#4CAF50', mb: 2 }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          Report Submitted!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Thank you for making your community safer.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: 600, 
      mx: 'auto', 
      p: 2,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffffff'
    }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1, color: '#f08800ff' }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
          Report Incident
        </Typography>
      </Box>

      <Card sx={{ 
        flex: 1,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 3
      }}>
        <Box sx={{ 
          bgcolor: '#6A1B9A', 
          p: 2,
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportIcon fontSize="small" />
            Safety Report
          </Typography>
        </Box>

        <CardContent sx={{ 
          p: 2, 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {loading && !location ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1
            }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Getting your location...
              </Typography>
            </Box>
          ) : locationError ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1,
              textAlign: 'center'
            }}>
              <WarningIcon color="error" sx={{ fontSize: 40 }} />
              <Typography color="error" sx={{ mt: 1, mb: 2 }}>
                {locationError}
              </Typography>
              <Button 
                variant="contained" 
                onClick={getLocation}
                size="small"
                startIcon={<RefreshIcon />}
              >
                Try Again
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                  Incident Type
                </Typography>
                <Grid container spacing={1}>
                  {crimeTypes.map((type) => (
                    <Grid item xs={6} key={type.value}>
                      <CompactCard
                        selected={formData.typeOfCrime === type.value}
                        onClick={() => setFormData({ ...formData, typeOfCrime: type.value })}
                      >
                        <CardContent sx={{ p: '12px !important' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1 
                          }}>
                            <Box sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: crimeTypeColors[type.value]
                            }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {type.label}
                            </Typography>
                          </Box>
                        </CardContent>
                      </CompactCard>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                  Severity Level
                </Typography>
                <Box sx={{ 
                  bgcolor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <SeverityIndicator severity={formData.severity}>
                    {formData.severity}
                  </SeverityIndicator>
                  <Typography variant="body2" sx={{ flex: 1, ml: 1 }}>
                    {formData.severity === 1 ? 'Minor' :
                     formData.severity === 2 ? 'Low' :
                     formData.severity === 3 ? 'Moderate' :
                     formData.severity === 4 ? 'High' : 'Critical'}
                  </Typography>
                </Box>
                <Slider
                  value={formData.severity}
                  onChange={(e, value) => setFormData({ ...formData, severity: value })}
                  min={1}
                  max={5}
                  step={1}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box sx={{ mb: 3, flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Details (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  placeholder="Describe what happened..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  inputProps={{ maxLength: 300 }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem'
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" color="text.secondary">
                          {formData.comments.length}/300
                        </Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              {location && (
                <Box sx={{ 
                  bgcolor: 'grey.100', 
                  p: 1.5, 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2
                }}>
                  <LocationIcon color="primary" sx={{ fontSize: 20 }} />
                  <Typography variant="caption">
                    Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={getLocation}
                    sx={{ ml: 'auto' }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {submitError && (
                <Box sx={{ 
                  bgcolor: 'error.light', 
                  p: 1.5, 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2
                }}>
                  <WarningIcon color="error" sx={{ fontSize: 20, color: 'white' }} />
                  <Typography variant="caption" color='white'>
                    {submitError}
                  </Typography>
                </Box>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !location}
                sx={{
                  mt: 'auto',
                  py: 1.5,
                  fontWeight: 600,
                  bgcolor: 'white',
                  color: '#6A1B9A',               // purple text
                  border: '2px solid #6A1B9A',    // purple border
                  '&:hover': {
                    bgcolor: '#F3E5F5',           // optional: light purple on hover
                    borderColor: '#4A148C',       // darker purple border on hover
                    color: '#4A148C',             // darker purple text on hover
                    transform: 'translateY(-1px)'
                  },
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}