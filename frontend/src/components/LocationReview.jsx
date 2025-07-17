import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Typography, Button, CircularProgress, MenuItem, Select } from '@mui/material';
import { useAuth } from './AuthContext';
import axios from 'axios'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LocationReview() {
  const { user } = useAuth();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [proximity, setProximity] = useState(5); // Default 5km
  const [crimeReports, setCrimeReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  // Initialize map and get user location
  useEffect(() => {
    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [74.255, 31.39], // Default center
        zoom: 12
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl());
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
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setCurrentLocation({ lng: longitude, lat: latitude });
        // console.log('location lng: ', longitude, 'lat: ', latitude );
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            essential: true
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

  const fetchCrimeReports = async () => {
    try {
    console.log('helloooo');
      setLoading(true);
      const response = await axios.get('http://localhost:5000/report/nearby-reports', {
        params: {
          longitude: currentLocation.lng,
          latitude: currentLocation.lat,
          maxDistance: proximity * 1000 // Convert km to meters
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('review ky liye data: ', response)
      
      setCrimeReports(response.data);
      drawCrimeReports(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch crime data');
      console.log('error is: ', err)
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
        console.log('Map style not loaded yet, retrying...');
        setTimeout(() => drawCrimeReports(reports), 100);
        return;
    }

    console.log('Drawing reports:', reports);

    // Clean up existing layers and sources
    try {
        if (map.current.getLayer('crime-reports')) {
        map.current.removeLayer('crime-reports');
        }
        if (map.current.getSource('crime-reports')) {
        map.current.removeSource('crime-reports');
        }
    } catch (e) {
        console.log('Cleanup error:', e);
    }

    if (!reports || reports.length === 0) {
        console.log('No reports to display');
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
            : [report.longitude, report.latitude] // Fallback for different API formats
        },
        properties: {
            id: report._id || report.id,
            type: report.typeOfCrime || 'Unknown',
            severity: report.severity || 1,
            description: report.comments || 'No description'
        }
        }))
    };

    console.log('Processed GeoJSON:', geojson);

    try {
        // Add source
        map.current.addSource('crime-reports', {
        type: 'geojson',
        data: geojson
        });

        // Add layer
        map.current.addLayer({
        id: 'crime-reports',
        type: 'circle',
        source: 'crime-reports',
        paint: {
            'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1, 8,
            5, 20
            ],
            'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1, '#bbff00',  
            3, '#FFFF00',  
            5, '#FF0000'   // Red for high
            ],
            'circle-opacity': 0.6,
            'circle-stroke-width': 0.5,
            'circle-stroke-color': '#000000',
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

    map.current.on('click', 'crime-reports', (e) => {
        const feature = e.features[0];
        if (!feature) return;

        new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`
            <strong>${feature.properties.type}</strong><br>
            Severity: ${feature.properties.severity}/5<br>
            ${feature.properties.description}
        `)
        .addTo(map.current);
    });

    map.current.on('mouseenter', 'crime-reports', () => {
        map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'crime-reports', () => {
        map.current.getCanvas().style.cursor = '';
    });
    };

// Draw current location marker
  const drawCurrentLocationMarker = (lng, lat) => {
    // Remove previous marker if exists
    if (map.current._currentLocationMarker) {
      map.current._currentLocationMarker.remove();
    }
    // Add new marker
    map.current._currentLocationMarker = new mapboxgl.Marker({ color: '#007aff' })
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Location Safety Review
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Select
          value={proximity}
          onChange={(e) => setProximity(e.target.value)}
          size="small"
        >
          <MenuItem value={1}>1 km</MenuItem>
          <MenuItem value={5}>5 km</MenuItem>
          <MenuItem value={10}>10 km</MenuItem>
        </Select>

        <Button
          variant="contained"
          onClick={getCurrentLocation}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Refresh Location
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Typography variant="h6" gutterBottom>
        Found {crimeReports.length} crime reports within {proximity} km
      </Typography>

      <Box
        ref={mapContainer}
        sx={{
          height: '500px',
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      />

      {loading && <CircularProgress sx={{ mt: 2 }} />}
    </Box>
  );
}