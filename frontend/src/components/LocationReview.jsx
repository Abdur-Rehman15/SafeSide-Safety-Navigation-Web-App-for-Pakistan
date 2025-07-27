import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  MenuItem, 
  Select,
  Paper,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  useTheme,
  styled
} from '@mui/material';
import { useAuth } from './AuthContext';
import axios from 'axios';
import {
  SafetyCheck as SafetyCheckIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Map as MapIcon,
} from '@mui/icons-material';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const REPORT_URL = import.meta.env.VITE_REPORT_URL;

// Custom styled components
const GradientPaper = styled(Paper)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(3),
  boxShadow: theme.shadows[6]
}));

const AnimatedButton = styled(Button)({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
  }
});

const CrimeTypeChip = styled(Chip)(({ theme, crimeType }) => ({
  backgroundColor: crimeType === 'theft' ? '#FF6B6B20' : 
                  crimeType === 'robbery' ? '#FF8E5320' :
                  crimeType === 'harassment' ? '#4ECDC420' : '#45B7D120',
  color: crimeType === 'theft' ? '#FF6B6B' : 
         crimeType === 'robbery' ? '#FF8E53' :
         crimeType === 'harassment' ? '#4ECDC4' : '#45B7D1',
  border: `1px solid ${crimeType === 'theft' ? '#FF6B6B' : 
                              crimeType === 'robbery' ? '#FF8E53' :
                              crimeType === 'harassment' ? '#4ECDC4' : '#45B7D1'}`,
  fontWeight: 600,
  textAlign: 'center',
  alignContent: 'center',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%'
}));

export default function LocationReview() {
  const theme = useTheme();
  const { user } = useAuth();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [proximity, setProximity] = useState(5); // Default 5km
  const [crimeReports, setCrimeReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [securityMetrics, setSecurityMetrics] = useState({
    overallSecurity: 100,
    categoryBreakdown: {
      theft: { percentage: 25, count: 0 },
      robbery: { percentage: 25, count: 0 },
      harassment: { percentage: 25, count: 0 },
      other: { percentage: 25, count: 0 }
    }
  });

  // Initialize map and get user location
  useEffect(() => {
    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Dark theme for better contrast
        center: [74.255, 31.39], // Default center
        zoom: 12,
        antialias: true // Improves rendering quality
      });

      // Add navigation controls with custom position
      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      }), 'bottom-right');
    }

    getCurrentLocation();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch crime reports when location or proximity changes
  useEffect(() => {
    if (currentLocation) {
      fetchCrimeReports();
    }
  }, [currentLocation, proximity]);

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setCurrentLocation({ lng: longitude, lat: latitude });
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            essential: true,
            speed: 0.8, // Slower fly-to animation
            curve: 1 // Smoother curve
          });
        }
        setLoading(false);
      },
      (err) => {
        setError('Please enable location services to check area safety');
        setLoading(false);
      }
    );
  };

  // Calculate security percentage based on crime reports
  const calculateSecurityMetrics = (reports) => {
    const crimeTypes = ['theft', 'robbery', 'harassment', 'other'];
    const categoryBreakdown = {};
    
    // Initialize categories
    crimeTypes.forEach(type => {
      categoryBreakdown[type] = { count: 0, percentage: 25 };
    });

    // Count reports by type and consider severity
    reports.forEach(report => {
      const crimeType = report.typeOfCrime.toLowerCase();
      if (categoryBreakdown[crimeType]) {
        categoryBreakdown[crimeType].count++;
      }
    });

    // Calculate percentage reduction based on report count and severity
    crimeTypes.forEach(type => {
      const count = categoryBreakdown[type].count;
      let reduction = 0;
      
      if (count === 0) {
        reduction = 0;
      } else if (count <= 2) {
        reduction = 5;
      } else if (count <= 5) {
        reduction = 10;
      } else if (count <= 10) {
        reduction = 15;
      } else {
        reduction = 20;
      }
      
      categoryBreakdown[type].percentage = Math.max(0, 25 - reduction);
    });

    // Calculate overall security percentage
    const overallSecurity = Object.values(categoryBreakdown)
      .reduce((sum, category) => sum + category.percentage, 0);

    return {
      overallSecurity,
      categoryBreakdown
    };
  };

  const fetchCrimeReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${REPORT_URL}/nearby-reports`, {
        params: {
          longitude: currentLocation.lng,
          latitude: currentLocation.lat,
          maxDistance: proximity * 1000
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      setCrimeReports(response.data);
      const metrics = calculateSecurityMetrics(response.data);
      setSecurityMetrics(metrics);
      
      drawCrimeReports(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch crime data');
    } finally {
      setLoading(false);
    }
  };

  const drawCrimeReports = (reports) => {
    if (!map.current) {
        console.error('Map not initialized');
        return;
    }

    // Wait for map to be fully loaded
    if (!map.current.isStyleLoaded()) {
        setTimeout(() => drawCrimeReports(reports), 100);
        return;
    }

    // Clean up existing layers and sources
    try {
      if (map.current.getLayer('crime-reports')) map.current.removeLayer('crime-reports');
      if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
      if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
      if (map.current.getSource('crime-reports')) map.current.removeSource('crime-reports');
    } catch (e) {
        console.log('Cleanup error:', e);
    }

    if (!reports || reports.length === 0) {
        return;
    }

    // Convert reports to GeoJSON format
    const geojson = {
        type: 'FeatureCollection',
        features: reports.map(report => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: Array.isArray(report.location.coordinates) 
            ? report.location.coordinates 
            : [report.longitude, report.latitude]
        },
        properties: {
            id: report._id || report.id,
            type: report.typeOfCrime || 'Unknown',
            severity: report.severity || 1,
            description: report.comments || 'No description',
            date: report.createdAt || new Date().toISOString()
        }
        }))
    };

    try {
        // Add source
        map.current.addSource('crime-reports', {
          type: 'geojson',
          data: geojson,
          cluster: true, // Enable clustering
          clusterMaxZoom: 14, // Max zoom to cluster points
          clusterRadius: 50 // Radius of each cluster
        });

        // Add cluster layers
        map.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'crime-reports',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#FF6B6B',
              10, '#FF8E53',
              30, '#FF5722'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              10, 25,
              30, 30
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Add cluster count labels
        map.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'crime-reports',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add individual crime points
        map.current.addLayer({
          id: 'crime-reports',
          type: 'circle',
          source: 'crime-reports',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'severity'],
              1, 8,
              5, 20
            ],
            'circle-color': [
              'match',
              ['get', 'type'],
              'theft', '#FF6B6B',
              'robbery', '#FF8E53',
              'harassment', '#4ECDC4',
              'other', '#45B7D1',
              '#999999'
            ],
            'circle-opacity': 0.8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-blur': 0.2
          }
        });

        // Add 3D buildings layer for context
        map.current.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        });

        // Add interactivity
        addInteractivity();

    } catch (e) {
        console.error('Error adding crime reports:', e);
    }
  };

  const addInteractivity = () => {
    if (!map.current) return;

    map.current.off('click', 'crime-reports');
    map.current.off('mouseenter', 'crime-reports');
    map.current.off('mouseleave', 'crime-reports');
    map.current.off('click', 'clusters');

    // Click on individual crime points
    map.current.on('click', 'crime-reports', (e) => {
      const feature = e.features[0];
      if (!feature) return;

      new mapboxgl.Popup({ offset: [0, -15], className: 'crime-popup' })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`
          <div class="crime-popup-content">
            <h4>${feature.properties.type.toUpperCase()}</h4>
            <div class="crime-severity">
              <span class="severity-label">Severity:</span>
              <span class="severity-value">${feature.properties.severity}/5</span>
            </div>
            <p>${feature.properties.description}</p>
            <div class="crime-date">${new Date(feature.properties.date).toLocaleDateString()}</div>
          </div>
        `)
        .addTo(map.current);
    });

    // Click on clusters
    map.current.on('click', 'clusters', (e) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      const source = map.current.getSource('crime-reports');

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        map.current.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
          duration: 500
        });
      });
    });

    // Mouse enter events
    map.current.on('mouseenter', 'crime-reports', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseenter', 'clusters', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    // Mouse leave events
    map.current.on('mouseleave', 'crime-reports', () => {
      map.current.getCanvas().style.cursor = '';
    });

    map.current.on('mouseleave', 'clusters', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  // Draw current location marker
  const drawCurrentLocationMarker = (lng, lat) => {
    if (map.current._currentLocationMarker) {
      map.current._currentLocationMarker.remove();
    }
    
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'current-location-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#007aff';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
    
    // Add pulse animation
    el.style.animation = 'pulse 2s infinite';
    
    map.current._currentLocationMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setText('Your Current Location'))
      .addTo(map.current);
  };

  // Update marker whenever currentLocation changes
  useEffect(() => {
    if (map.current && currentLocation) {
      drawCurrentLocationMarker(currentLocation.lng, currentLocation.lat);
    }
  }, [currentLocation]);

  // Get security status color and text
  const getSecurityStatus = (percentage) => {
    if (percentage >= 80) return { color: '#4CAF50', text: 'Very Safe', icon: '👍', bgColor: '#E8F5E8' };
    if (percentage >= 60) return { color: '#8BC34A', text: 'Safe', icon: '👍', bgColor: '#F1F8E9' };
    if (percentage >= 40) return { color: '#FF9800', text: 'Moderate', icon: '⚠️', bgColor: '#FFF3E0' };
    if (percentage >= 20) return { color: '#FF5722', text: 'Unsafe', icon: '⚠️', bgColor: '#FFEBEE' };
    return { color: '#F44336', text: 'Very Unsafe', icon: '❗', bgColor: '#FFEBEE' };
  };

  const securityStatus = getSecurityStatus(securityMetrics.overallSecurity);

  // Add some CSS animations
  const styles = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    .crime-popup {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
    }
    
    .crime-popup-content {
      padding: 12px;
    }
    
    .crime-popup-content h4 {
      margin: 0 0 8px 0;
      color: ${theme.palette.primary.main};
    }
    
    .crime-severity {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .severity-label {
      font-weight: 500;
    }
    
    .severity-value {
      font-weight: 700;
      color: ${theme.palette.secondary.main};
    }
    
    .crime-date {
      font-size: 0.8rem;
      color: #666;
      margin-top: 8px;
    }
    
    .mapboxgl-popup-close-button {
      font-size: 18px;
      padding: 4px 8px;
    }
    
    .safety-score {
      animation: pulse 2s infinite;
    }
  `;

  return (
    <Box sx={{ p: 3 }}>
      <style>{styles}</style>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SafetyCheckIcon fontSize="large" color="primary" /> Location Safety Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time crime data and security assessment for your current location
        </Typography>
      </Box>

      {/* Controls Section */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: theme.shadows[2] }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon color="primary" />
                <Select
                  value={proximity}
                  onChange={(e) => setProximity(e.target.value)}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value={1}>1 km radius</MenuItem>
                  <MenuItem value={5}>5 km radius</MenuItem>
                  <MenuItem value={10}>10 km radius</MenuItem>
                </Select>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <AnimatedButton
                variant="contained"
                onClick={getCurrentLocation}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                fullWidth
                sx={{
                  mt: 'auto',
                  bgcolor: '#6A1B9A',
                  border: '2px solid #6A1B9A', // purple outline
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#4A148C',
                    transform: 'translateY(-1px)',
                    borderColor: '#4A148C' // optional: darker outline on hover
                  },
}}
              >
                {loading ? 'Updating...' : 'Refresh Location'}
              </AnimatedButton>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  {currentLocation ? 
                    `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}` : 
                    'Location not available'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Card sx={{ mb: 3, backgroundColor: theme.palette.error.light }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon color='white' />
            <Typography color='white'>
              {error}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Security Metrics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Overall Security Card */}
        <Grid item xs={12} md={6}>
          <GradientPaper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: 'white', opacity: 0.9 }}>
                  SECURITY SCORE
                </Typography>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontWeight: 800, 
                    color: 'white',
                    fontSize: '4rem',
                    lineHeight: 1,
                    mb: 1
                  }}
                  className="safety-score"
                >
                  {securityMetrics.overallSecurity}%
                </Typography>
                <Chip 
                  label={securityStatus.text} 
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600
                  }} 
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1
                }}>
                  <Typography variant="h3" sx={{ color: 'white' }}>
                    {securityStatus.icon}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                  {crimeReports.length} reports in area
                </Typography>
              </Box>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={securityMetrics.overallSecurity} 
              sx={{ 
                height: 10, 
                borderRadius: 5,
                mt: 3,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white'
                }
              }} 
            />
          </GradientPaper>
        </Grid>

        {/* Crime Breakdown Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: theme.shadows[3], border: '1px solid #8b03a7ff' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Crime Category Analysis
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {Object.entries(securityMetrics.categoryBreakdown).map(([type, data]) => (
                  <Grid item xs={6} key={type}>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <CrimeTypeChip 
                          label={type.charAt(0).toUpperCase() + type.slice(1)} 
                          crimeType={type}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, ml:1, mt:0.3 }}>
                            {data.percentage}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(data.percentage / 25) * 100} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: data.percentage >= 20 ? '#4CAF50' : 
                                           data.percentage >= 15 ? '#FF9800' : 
                                           data.percentage >= 10 ? '#FF5722' : '#F44336'
                          }
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        {data.count} {data.count === 1 ? 'report' : 'reports'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Last updated: {new Date().toLocaleTimeString()}
                </Typography>
                <Button 
                  size="small" 
                  onClick={fetchCrimeReports}
                  disabled={loading}
                  startIcon={<RefreshIcon fontSize="small" />}
                >
                  Refresh Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Map Section */}
      <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden', boxShadow: theme.shadows[3] }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#ee8803ff' }}>
            <MapIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Crime Heatmap
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Found {crimeReports.length} crime reports within {proximity} km radius
          </Typography>
        </Box>
        <Box
          ref={mapContainer}
          sx={{
            height: '500px',
            width: '100%',
          }}
        />
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center', 
                    backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 1000 }}>
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}
      </Card>
    </Box>
  );
}