import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  Slider,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  useTheme,
  styled,
  InputAdornment
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

const AnimatedCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8]
  }
}));

const SeverityIndicator = styled(Box)(({ severity, theme }) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  backgroundColor: 
    severity === 1 ? '#4CAF50' :
    severity === 2 ? '#8BC34A' :
    severity === 3 ? '#FFC107' :
    severity === 4 ? '#FF9800' : '#F44336',
  border: '2px solid white',
  boxShadow: theme.shadows[1],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '0.75rem'
}));

const CrimeTypeCard = styled(Card)(({ selected, crimeType, theme }) => ({
  cursor: 'pointer',
  border: `2px solid ${selected ? 
    (crimeType === 'theft' ? '#FF6B6B' : 
     crimeType === 'robbery' ? '#FF8E53' : 
     crimeType === 'harassment' ? '#4ECDC4' : '#45B7D1') : theme.palette.grey[300]}`,
  backgroundColor: selected ? 
    (crimeType === 'theft' ? '#FF6B6B10' : 
     crimeType === 'robbery' ? '#FF8E5310' : 
     crimeType === 'harassment' ? '#4ECDC410' : '#45B7D110') : 'transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.02)'
  }
}));

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
      await axios.post('http://localhost:5000/report/submit-report', {
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
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const crimeTypes = [
    { value: 'theft', label: 'Theft', color: '#FF6B6B' },
    { value: 'robbery', label: 'Robbery', color: '#FF8E53' },
    { value: 'harassment', label: 'Harassment', color: '#4ECDC4' },
    { value: 'other', label: 'Other', color: '#45B7D1' }
  ];

  if (success) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        textAlign: 'center'
      }}>
        <SuccessIcon sx={{ fontSize: 80, color: '#4CAF50', mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Report Submitted Successfully!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Thank you for helping make your community safer.
        </Typography>
        <CircularProgress size={24} sx={{ color: '#4CAF50' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Button 
        startIcon={<BackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <AnimatedCard sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ 
          backgroundColor: theme.palette.primary.main, 
          p: 3,
          color: 'white',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReportIcon fontSize="large" />
            Report a Crime Incident
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
            Help keep your community safe by reporting suspicious activities or crimes
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {loading && !location ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={60} thickness={4} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Getting your location...
              </Typography>
            </Box>
          ) : locationError ? (
            <Box textAlign="center" py={4}>
              <WarningIcon color="error" sx={{ fontSize: 60 }} />
              <Typography variant="h6" color="error" sx={{ mt: 2 }}>
                {locationError}
              </Typography>
              <Button 
                variant="contained" 
                onClick={getLocation} 
                sx={{ mt: 3 }}
                startIcon={<RefreshIcon />}
              >
                Try Again
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                1. Select Crime Type
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {crimeTypes.map((type) => (
                  <Grid item xs={12} sm={6} key={type.value}>
                    <CrimeTypeCard
                      selected={formData.typeOfCrime === type.value}
                      crimeType={type.value}
                      onClick={() => setFormData({ ...formData, typeOfCrime: type.value })}
                    >
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: `${type.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Box sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: type.color
                          }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {type.label}
                        </Typography>
                      </CardContent>
                    </CrimeTypeCard>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                2. Rate Severity
              </Typography>
              
              <Box sx={{ 
                backgroundColor: theme.palette.grey[100], 
                p: 3, 
                borderRadius: 2,
                mb: 4
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="body1" sx={{ minWidth: 80 }}>
                    Severity:
                  </Typography>
                  <SeverityIndicator severity={formData.severity}>
                    {formData.severity}
                  </SeverityIndicator>
                  <Typography variant="body1" sx={{ ml: 'auto', fontWeight: 600 }}>
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
                  marks={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                    { value: 5, label: '5' }
                  ]}
                  sx={{
                    '& .MuiSlider-markLabel': {
                      transform: 'translateY(20px)'
                    }
                  }}
                />
              </Box>

              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                3. Add Details
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={5}
                variant="outlined"
                label="Describe the incident (Optional)"
                placeholder="Provide details about what happened, when it occurred, descriptions of people involved, etc."
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                inputProps={{ maxLength: 500 }}
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" color="text.secondary">
                        {formData.comments.length}/500
                      </Typography>
                    </InputAdornment>
                  )
                }}
              />

              {location && (
                <Box sx={{ 
                  backgroundColor: theme.palette.grey[100], 
                  p: 2, 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <LocationIcon color="primary" />
                  <Typography variant="body2">
                    Your current location: 
                    <Box component="span" sx={{ fontWeight: 600, ml: 1 }}>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Box>
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={getLocation}
                    startIcon={<RefreshIcon fontSize="small" />}
                    sx={{ ml: 'auto' }}
                  >
                    Refresh
                  </Button>
                </Box>
              )}

              {submitError && (
                <Box sx={{ 
                  backgroundColor: theme.palette.error.light, 
                  p: 2, 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <WarningIcon color="error" />
                  <Typography color="error">
                    {submitError}
                  </Typography>
                </Box>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !location}
                sx={{ 
                  mt: 2,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    Submitting Report...
                  </>
                ) : (
                  'Submit Crime Report'
                )}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                By submitting this report, you agree that the information provided is accurate to the best of your knowledge.
              </Typography>
            </form>
          )}
        </CardContent>
      </AnimatedCard>
    </Box>
  );
}