// LiveRouteMap.jsx - Debugged and Fixed Version
import React, { useEffect, useRef, useState } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { TextField, Button, Typography, Box, Paper, Radio, RadioGroup, FormControlLabel, styled, InputAdornment, Alert,
  useTheme, Grid } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import DriveIcon from '@mui/icons-material/DirectionsCar';
import WalkIcon from '@mui/icons-material/DirectionsWalk';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsIcon from '@mui/icons-material/Directions';
import Modal from '@mui/material/Modal';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import ReportIcon from '@mui/icons-material/Report';
import { useNavigate } from 'react-router-dom';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SafeRouteMap({ end: propEnd }) {
  const theme = useTheme();
  
  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });
  
  const mapContainer = useRef(null);
  const map = useRef(null);
  const autocompleteRef = useRef();
  const inputRef = useRef();
  const destinationMarker = useRef(null);
  const geolocateControlRef = useRef();
  const navigate = useNavigate();

  // Add a ref to store the geolocation watch ID
  const positionWatchId = useRef(null);

  const [initializationPhase, setInitializationPhase] = useState(true);
  const [travelMode, setTravelMode] = useState('driving');
  const [destination, setDestination] = useState(propEnd || null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [end, setEnd] = useState(propEnd || null);
  const [riskWarning, setRiskWarning] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [shouldCalculateRoute, setShouldCalculateRoute] = useState(false);
  const [openOnce, setOpenOnce] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [warningOpen, setWarningOpen] = useState(true);
  const recenterButtonRef = useRef(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [routeSteps, setRouteSteps] = useState([]);
  const dangerZonesDrawnRef = useRef(false);
  const currentRouteRef = useRef(null);
  const lastCalculatedPositionRef = useRef(null);
  const [userProgressIndex, setUserProgressIndex] = useState(0);
  const routeCoordinatesRef = useRef([]);
  const [routeSafetyChange, setRouteSafetyChange] = useState(null);
  const lastRouteSeverityRef = useRef(null);

  const deviationThreshold = 40; // meters
  const emergencyNumber = localStorage.getItem('emergecyNumber') || 15;
  
  // Map initialization
  const handleInitializeMap = () => {
    if (!destination) {
      setLocationError("Please select a destination");
      return;
    }
    setInitializationPhase(false);
    setTimeout(() => {
      initializeMap();
    }, 100);
  };

  // Draw current location and destination markers as soon as both are available and map is loaded
  useEffect(() => {
    if (!mapLoaded || !end) return;
    
    // Only need to handle destination marker now
    if (map.current && destinationMarker.current) {
      destinationMarker.current
        .setLngLat(end)
        .setPopup(new mapboxgl.Popup().setHTML("<b>Destination</b>"))
        .addTo(map.current);
    }
  }, [mapLoaded, end]);

  // Danger zones fetch
  useEffect(() => {
    if (!currentPosition) return;
    const fetchDangerZones = async () => {
      try {
      //   const response = await axios.get('http://localhost:5000/report/all-reports', {
      //     headers: {
      //       Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      //       'Accept': 'application/json',
      //       'Content-Type': 'application/json'
      //     },
      //     withCredentials: true
      //   });

        const response=[
          {
              "location": {
                  "type": "Point",
                  "coordinates": [
                      74.26,
                      31.390014
                  ]
              },
              "votes": {
                  "upvotes": [],
                  "downvotes": [],
                  "score": 0
              },
              "_id": "687a61eed4f0cdeb1eab8bb4",
              "user": {
                  "_id": "6876ba94936e42ef917f665a",
                  "firstName": "Abdur",
                  "lastName": "Rehman",
                  "email": "abdurrehman@gmail.com"
              },
              "userId": 1,
              "typeOfCrime": "harassment",
              "severity": 5,
              "comments": "neww!",
              "reportedAt": "2025-07-18T15:02:06.033Z",
              "__v": 0
          },
          {
              "location": {
                  "type": "Point",
                  "coordinates": [
                      74.244,
                      31.3909
                  ]
              },
              "votes": {
                  "upvotes": [],
                  "downvotes": [],
                  "score": 0
              },
              "_id": "687b98f08a6ebc4d1eed50d5",
              "user": {
                  "_id": "6876ba94936e42ef917f665a",
                  "firstName": "Abdur",
                  "lastName": "Rehman",
                  "email": "abdurrehman@gmail.com"
              },
              "userId": 1,
              "typeOfCrime": "robbery",
              "severity": 3,
              "comments": "my loc",
              "reportedAt": "2025-07-19T13:09:04.530Z",
              "__v": 0
          }
        ];

        const zones = response.map((report, index) => ({
          id: report._id || `zone-${index}`,
          lat: report.location.coordinates[1],
          lng: report.location.coordinates[0],
          severity: report.severity || 1,
          radius: (() => {
            const sev = report.severity || 1;
            if (sev === 1) return 100;
            if (sev === 2) return 150;
            if (sev === 3) return 200;
            if (sev === 4) return 250;
            if (sev === 5) return 300;
            return 100;
          })(),
          description: report.comments || 'No description',
          type: report.typeOfCrime || report.type || report.category || 'Danger Zone',
          createdAt: report.createdAt || report.date || null
        }));
        setDangerZones(zones);
      } catch (err) {
        setLocationError('Failed to load danger zone data');
      }
    };
    fetchDangerZones();
  }, [currentPosition]);

  useEffect(() => {
    if (riskWarning) {
      setWarningOpen(true);
    }
  }, [riskWarning]);

  useEffect(() => {
    if (!isNavigating || !currentPosition || !mapLoaded) return;

    // Only calculate if:
    // 1. We don't have a route yet, OR
    // 2. User has deviated from current route, OR
    // 3. It's the first calculation after starting navigation
    const shouldRecalculate = (
      !currentRouteRef.current ||
      hasDeviatedFromRoute(currentPosition) ||
      !lastCalculatedPositionRef.current
    );

    if (shouldRecalculate) {
      setShouldCalculateRoute(true);
      lastCalculatedPositionRef.current = currentPosition;
    }
  }, [currentPosition, isNavigating, mapLoaded]);

  useEffect(() => {
    if (!isNavigating || !currentPosition) return;
    if (shouldCalculateRoute) {
      const calculateAndDraw = async () => {
        const route = await updateRouteWithAvoidance(currentPosition, end);
        if (route) {
          currentRouteRef.current = route;
        }
        setOpenOnce(false); // Hide popup after first calculation
        setShouldCalculateRoute(false);
      };
      calculateAndDraw();
    }
  }, [currentPosition, isNavigating, end, shouldCalculateRoute]);

  // Draw danger zones
  useEffect(() => {
    if (mapLoaded && dangerZones.length > 0 && !dangerZonesDrawnRef.current) {
      drawAllDangerZones();
      setLoading(false); 
      dangerZonesDrawnRef.current = true;
    }
  }, [mapLoaded, dangerZones]);

  useEffect(() => {
    if (propEnd) setEnd(propEnd);
  }, [propEnd]);

  useEffect(() => { 
    if (!isNavigating || !currentPosition || !map.current || !map.current.getSource('route')) return;

    // Find closest point on route to current position
    const closestIndex = findClosestRoutePointIndex(currentPosition, routeCoordinatesRef.current);
    // Only update if user has progressed significantly
    if (closestIndex > userProgressIndex) {
      setUserProgressIndex(closestIndex);
      console.log('DRAWING TRIMMED ROUTE....');
      // Update route geometry to only show remaining path
      const remainingCoordinates = routeCoordinatesRef.current.slice(closestIndex);
      // Prevent route from disappearing if user is ahead of the last point
      if (remainingCoordinates.length < 2) {
        console.log('⚠️ Not enough coordinates to update route');
        return;
      }

      // Validate coordinates
      if (!remainingCoordinates.every(coord => Array.isArray(coord) && coord.length === 2 && 
          typeof coord[0] === 'number' && typeof coord[1] === 'number')) {
        console.error('❌ Invalid coordinates in remaining route');
        return;
      }

      // Create a route object for the remaining path
      const remainingRoute = {
        geometry: {
          type: 'LineString',
          coordinates: remainingCoordinates
        }
      };

      // Recalculate severity for the remaining route
      const remainingRouteSeverity = calculateRouteSeverity(remainingRoute, dangerZones);
      
      // Check if route safety level has changed
      if (lastRouteSeverityRef.current !== null && 
          lastRouteSeverityRef.current.maxSeverity !== remainingRouteSeverity.maxSeverity) {
        setRouteSafetyChange({
          from: lastRouteSeverityRef.current.maxSeverity,
          to: remainingRouteSeverity.maxSeverity,
          timestamp: Date.now()
        });
        // Clear the notification after 3 seconds
        setTimeout(() => setRouteSafetyChange(null), 3000);
      }
      lastRouteSeverityRef.current = remainingRouteSeverity;
      
      // Determine color based on remaining danger zones
      let routeColor = '#3a86ff'; // Default blue
      if (remainingRouteSeverity.maxSeverity >= 4) {
        routeColor = '#ff0000'; // Red for high risk
      } else if (remainingRouteSeverity.maxSeverity >= 3) {
        routeColor = '#ff6600'; // Orange for moderate risk
      } else if (remainingRouteSeverity.maxSeverity >= 1) {
        routeColor = '#ffff00'; // Yellow for low risk
      } else {
        routeColor = '#00ff00'; // Green for safe
      }

      // Get color name for logging
      const getColorName = (color) => {
        switch(color) {
          case '#ff0000': return 'RED (High Risk)';
          case '#ff6600': return 'ORANGE (Moderate Risk)';
          case '#ffff00': return 'YELLOW (Low Risk)';
          case '#00ff00': return 'GREEN (Safe)';
          case '#3a86ff': return 'BLUE (Normal)';
          default: return color;
        }
      };

      console.log('Route color updated:', {
        maxSeverity: remainingRouteSeverity.maxSeverity,
        intersectingZones: remainingRouteSeverity.intersectingZones.length,
        color: getColorName(routeColor),
        progressIndex: closestIndex,
        totalPoints: routeCoordinatesRef.current.length
      });

      // Update route data with new geometry and color
      try {
        if (map.current.getSource('route')) {
          map.current.getSource('route').setData({
            type: 'Feature',
            properties: remainingRouteSeverity,
            geometry: {
              type: 'LineString',
              coordinates: remainingCoordinates
            }
          });
          console.log('✅ Route data updated successfully');
        } else {
          console.error('❌ Route source not found, redrawing route...');
          // Redraw the route if source is missing
          drawRoute(remainingRoute, routeColor, remainingRouteSeverity);
          return;
        }
      } catch (error) {
        console.error('❌ Error updating route data:', error);
        // Redraw the route if update fails
        drawRoute(remainingRoute, routeColor, remainingRouteSeverity);
        return;
      }

      // Update route color
      try {
        if (map.current.getLayer('route')) {
          map.current.setPaintProperty('route', 'line-color', routeColor);
          
          // Update line width based on severity
          let lineWidth = 6;
          if (remainingRouteSeverity.maxSeverity >= 4) {
            lineWidth = 8; // Thicker line for high-risk routes
          } else if (remainingRouteSeverity.maxSeverity >= 3) {
            lineWidth = 7; // Medium thickness for moderate risk
          }
          map.current.setPaintProperty('route', 'line-width', lineWidth);
          console.log('✅ Route color and width updated successfully');
        } else {
          console.error('❌ Route layer not found');
        }
      } catch (error) {
        console.error('❌ Error updating route color:', error);
      }

      // Handle route outline for high-risk routes
      try {
        if (remainingRouteSeverity.maxSeverity >= 4) {
          // Add outline if it doesn't exist
          if (!map.current.getLayer('route-outline')) {
            map.current.addLayer({
              id: 'route-outline',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': 10,
                'line-opacity': 0.5
              }
            }, 'route'); // Add below the main route layer
            console.log('✅ Route outline added for high-risk route');
          }
        } else {
          // Remove outline if it exists and risk is not high
          if (map.current.getLayer('route-outline')) {
            map.current.removeLayer('route-outline');
            console.log('✅ Route outline removed');
          }
        }
      } catch (error) {
        console.error('❌ Error handling route outline:', error);
      }

      // Calculate remaining distance
      let totalRemainingDistance = 0;
      for (let i = 0; i < remainingCoordinates.length - 1; i++) {
        totalRemainingDistance += haversineDistance(remainingCoordinates[i], remainingCoordinates[i + 1]);
      }
      setRemainingDistance(totalRemainingDistance);

      // Update risk warning based on remaining path
      if (remainingRouteSeverity.maxSeverity >= 4) {
        setRiskWarning({
          level: "HIGH RISK",
          message: `Remaining route passes through ${remainingRouteSeverity.intersectingZones.length} high-risk danger zone(s). Exercise extreme caution.`,
          color: "bg-red-100 text-red-800"
        });
      } else if (remainingRouteSeverity.maxSeverity >= 3) {
        setRiskWarning({
          level: "⚠️ MODERATE RISK",
          message: `Remaining route passes through ${remainingRouteSeverity.intersectingZones.length} moderate-risk danger zone(s). Stay alert.`,
          color: "bg-orange-100 text-orange-800"
        });
      } else if (remainingRouteSeverity.maxSeverity >= 1) {
        setRiskWarning({
          level: "⚠️ LOW RISK",
          message: `Remaining route passes through ${remainingRouteSeverity.intersectingZones.length} low-risk danger zone(s). Stay cautious.`,
          color: "bg-yellow-100 text-yellow-800"
        });
      } else {
        setRiskWarning({
          level: "SAFE ROUTE",
          message: "Remaining route is clear of danger zones. Safe travel!",
          color: "bg-green-100 text-green-800"
        });
      }

      // Check if user has arrived
      if (closestIndex === routeCoordinatesRef.current.length - 1) {
        const distanceToEnd = haversineDistance(currentPosition, routeCoordinatesRef.current[routeCoordinatesRef.current.length - 1]);
        if (distanceToEnd < 30) { // Within 30 meters of destination
          setHasArrived(true);
          setIsNavigating(false);
        }
      }
    }
  }, [currentPosition, isNavigating, dangerZones]);

  const initializeMap = () => {
    if (map.current || !mapContainer.current) return;

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      console.log('Location is not turned on')
      return;
    }

    setLoading(true); 

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = [pos.coords.longitude, pos.coords.latitude];
        setCurrentPosition(userCoords);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: userCoords,
          zoom: 16
        });

        // Add controls
        map.current.addControl(new mapboxgl.NavigationControl());
        map.current.addControl(new mapboxgl.ScaleControl());

        // Only initialize destination marker
        destinationMarker.current = new mapboxgl.Marker({ color: '#FF0000' });

        // Add GeolocateControl
        geolocateControlRef.current = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
          showUserLocation: true // This shows Mapbox's default marker
        });
        map.current.addControl(geolocateControlRef.current);

        // Set up event handlers
        geolocateControlRef.current.on('geolocate', (position) => {
          console.log('Mapbox geolocate event:', position);
          const newPosition = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setCurrentPosition(newPosition);
        });

        geolocateControlRef.current.on('error', (error) => {
          setLocationError(getLocationErrorMessage(error));
        });

        // Automatically trigger geolocation on initialization
        map.current.on('load', () => {
          setMapLoaded(true);
          geolocateControlRef.current.trigger(); // Always trigger geolocation on map load
          if (destination) updateDestinationMarker(destination);       
        });

        setLoading(false); 
      },
      (err) => {
        setLocationError("Please turn on your location and allow access to use this feature.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
    );
  };

  useEffect(() => {
    if (mapLoaded && map.current) {
      if (geolocateControlRef.current) {
        geolocateControlRef.current.trigger();
      }
    }
  }, [mapLoaded]);

  const findClosestRoutePointIndex = (position, coordinates) => {
    if (!coordinates || coordinates.length === 0) return 0;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    
    // Only search from current progress index forward for efficiency
    for (let i = userProgressIndex; i < coordinates.length; i++) {
      const dist = haversineDistance(position, coordinates[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  };

  const hasDeviatedFromRoute = (currentPos) => {
    if (!currentRouteRef.current) return true;
    
    const routeCoordinates = currentRouteRef.current.geometry.coordinates;
    let minDistance = Infinity;
    
    for (const coord of routeCoordinates) {
      const dist = haversineDistance(currentPos, coord);
      if (dist < minDistance) minDistance = dist;
      if (dist < deviationThreshold) return false; // Still on route
    }
    
    return minDistance > deviationThreshold;
  };

  // Route calculation logic
  const updateRouteWithAvoidance = async (startPos, endPos) => {
    if (!mapLoaded || !map.current) return null;
    try {
      // Direct route
      const directRoute = await getDirectRoute(startPos, endPos);
      if (dangerZones.length === 0) {
        drawRoute(directRoute, '#00ff00');
        return directRoute;
      }
      // Exclude start/destination zones
      const startZones = dangerZones.filter(zone => haversineDistance([zone.lng, zone.lat], startPos) <= zone.radius);
      const destinationZones = dangerZones.filter(zone => haversineDistance([zone.lng, zone.lat], endPos) <= zone.radius);
      const zonesToAvoid = dangerZones.filter(zone => !startZones.includes(zone) && !destinationZones.includes(zone));
      const intersectingZones = checkRouteIntersection(directRoute, zonesToAvoid);

      if (intersectingZones.length === 0) {
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        drawRoute(directRoute, hasLocationZones ? '#ff6600' : '#3a86ff');
        setRiskWarning(hasLocationZones ? {
          level: "⚠️ CAUTION",
          message: "You are starting or ending in a danger zone area. Stay alert.",
          color: "bg-yellow-100 text-yellow-800"
        } : null);
        return directRoute;
      }

      // Try avoidance route
      const avoidanceRoute = await calculateRobustAvoidanceRoute(startPos, endPos, intersectingZones);
      if (avoidanceRoute) {
        const avoidanceIntersections = checkRouteIntersection(avoidanceRoute, intersectingZones);
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        if (avoidanceIntersections.length === 0) {
          drawRoute(avoidanceRoute, '#00ff00');
          setRiskWarning({
            level: "SAFE ROUTE",
            message: hasLocationZones
              ? "Route avoids all danger zones, but your start or destination is inside a danger zone. Stay alert at these locations."
              : "Route successfully avoids all danger zones. Safe travel!",
            color: "bg-green-100 text-green-800"
          });
          return avoidanceRoute;
        }
        if (avoidanceIntersections.length === 0) {
          return avoidanceRoute;
        }
      }

      // If no avoidance route, find best route with severity consideration
      const bestRoute = await findBestRouteWithSeverityConsideration(startPos, endPos, intersectingZones);
      if (bestRoute && bestRoute.route) {
        const finalIntersections = checkRouteIntersection(bestRoute.route, intersectingZones);
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        if (finalIntersections.length === 0) {
          drawRoute(bestRoute.route, '#00ff00');
          setRiskWarning({
            level: "SAFE ROUTE", 
            message: hasLocationZones 
              ? "Route avoids all danger zones, but your start or destination is inside a danger zone. Stay alert at these locations."
              : "Route successfully avoids all danger zones. Safe travel!",
            color: "bg-green-100 text-green-800"
          });
          return bestRoute.route;
        } else {
          const severityColor = bestRoute.maxSeverity >= 4 ? '#ff0000' :
                                bestRoute.maxSeverity >= 3 ? '#ff6600' : '#ffff00';
          drawRoute(bestRoute.route, severityColor);
          const severityWarning = getSeverityWarningMessage(bestRoute.totalSeverity, bestRoute.maxSeverity, finalIntersections.length);
          setRiskWarning({
            level: bestRoute.maxSeverity >= 4 ? "HIGH RISK" : bestRoute.maxSeverity >= 3 ? "⚠️ MODERATE RISK" : "⚠️ LOW RISK",
            message: severityWarning,
            color: bestRoute.maxSeverity >= 4 ? "bg-red-100 text-red-800" : bestRoute.maxSeverity >= 3 ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"
          });
          return bestRoute.route;
        }
      } else {
        setLocationError("No route found through danger zones.");
        return null;
      }
    } catch (error) {
      setLocationError("Failed to calculate route. Please check your connection and try again.");
      return null;
    }
  };
  // NEW: Find the best route considering severity of danger zones
  const findBestRouteWithSeverityConsideration = async (startPos, endPos, intersectingZones) => {
    console.log("Finding best route with severity consideration...");
    
    const routeOptions = [];
    
    // Option 1: Direct route (baseline)
    try {
      const directRoute = await getDirectRoute(startPos, endPos);
      const directRouteSeverity = calculateRouteSeverity(directRoute, intersectingZones);
      routeOptions.push({
        route: directRoute,
        type: 'direct',
        ...directRouteSeverity
      });
      console.log("Direct route severity:", directRouteSeverity);
    } catch (error) {
      console.error("Failed to get direct route:", error);
    }
    
    // Option 2: Try multiple waypoint strategies to find routes with lower severity
    const waypointStrategies = await generateWaypointStrategies(startPos, endPos, intersectingZones);
    
    for (const strategy of waypointStrategies) {
      try {
        const route = await getRouteWithWaypoints(startPos, endPos, strategy.waypoints);
        const routeSeverity = calculateRouteSeverity(route, dangerZones);
        
        routeOptions.push({
          route: route,
          type: strategy.type,
          ...routeSeverity
        });
        
        console.log(`${strategy.type} route severity:`, routeSeverity);
      } catch (error) {
        console.log(`${strategy.type} route failed:`, error.message);
      }
    }
    
    // Select the best route based on severity and other factors
    const bestRoute = selectBestRoute(routeOptions);
    console.log("Selected best route:", bestRoute);
    
    return bestRoute;
  };

  // NEW: Calculate severity impact of a route

  const calculateRouteSeverity = (route, zonesToCheck) => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return { totalSeverity: Infinity, maxSeverity: 5, intersectingZones: [] };
    }

    // Use the specific zones passed in, or fall back to all danger zones
    const zones = zonesToCheck || dangerZones;
    const intersectingZones = checkRouteIntersection(route, zones);
    
    if (intersectingZones.length === 0) {
      return { totalSeverity: 0, maxSeverity: 0, intersectingZones: [] };
    }
    
    const severities = intersectingZones.map(zone => zone.severity || 1);
    const totalSeverity = severities.reduce((sum, severity) => sum + severity, 0);
    const maxSeverity = Math.max(...severities);
    
    return {
      totalSeverity,
      maxSeverity,
      intersectingZones,
      averageSeverity: totalSeverity / intersectingZones.length
    };
  };

  // NEW: Generate different waypoint strategies for route alternatives
const generateWaypointStrategies = async (startPos, endPos, intersectingZones) => {
  const strategies = [];
  
  // Strategy 1: Avoid highest severity zones first
  const sortedZones = [...intersectingZones].sort((a, b) => (b.severity || 1) - (a.severity || 1));
  
  for (let i = 0; i < Math.min(3, sortedZones.length); i++) {
    const zone = sortedZones[i];
    const zoneCenter = [zone.lng, zone.lat];
    const safeDistance = zone.radius * 3; // Increased distance for high severity zones
    
    // Try waypoints in multiple directions
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    
    for (const angle of angles) {
      const waypoint = calculateDestination(zoneCenter, angle, safeDistance);
      strategies.push({
        type: `avoid-high-severity-${zone.id}-${angle}`,
        waypoints: [waypoint],
        targetZone: zone
      });
    }
  }
  
  // Strategy 2: Multiple waypoints around all high severity zones
  const highSeverityZones = intersectingZones.filter(zone => (zone.severity || 1) >= 4);
  if (highSeverityZones.length > 0 && highSeverityZones.length <= 3) {
    const waypoints = [];
    
    highSeverityZones.forEach(zone => {
      const zoneCenter = [zone.lng, zone.lat];
      const safeDistance = zone.radius * 2.5;
      
      // Find best direction to avoid this zone
      const bearing = calculateBearing(startPos, endPos);
      const perpendicularBearing = (bearing + 90) % 360;
      
      const waypoint = calculateDestination(zoneCenter, perpendicularBearing, safeDistance);
      waypoints.push(waypoint);
    });
    
    strategies.push({
      type: 'avoid-multiple-high-severity',
      waypoints: waypoints
    });
  }
  
  // Strategy 3: Wide detour around all intersecting zones
  const allZonesCentroid = calculateCentroid(intersectingZones);
  const detourDistance = Math.max(...intersectingZones.map(z => z.radius)) * 4;
  
  const detourAngles = [45, 135, 225, 315];
  detourAngles.forEach(angle => {
    const waypoint = calculateDestination(allZonesCentroid, angle, detourDistance);
    strategies.push({
      type: `wide-detour-${angle}`,
      waypoints: [waypoint]
    });
  });
  
  return strategies;
};

  // NEW: Select the best route from available options
  const selectBestRoute = (routeOptions) => {
    if (routeOptions.length === 0) {
      return { route: null, totalSeverity: Infinity, maxSeverity: 5 };
    }
    
    // Sort routes by multiple criteria:
    // 1. Total severity (lower is better)
    // 2. Maximum severity (lower is better)
    // 3. Number of intersecting zones (fewer is better)
    // 4. Route distance (shorter is better, but less important)
    
    const scoredRoutes = routeOptions.map(option => {
      const severityScore = option.totalSeverity * 10; // High weight for total severity
      const maxSeverityScore = option.maxSeverity * 5; // Weight for maximum severity
      const zoneCountScore = option.intersectingZones.length * 2; // Weight for number of zones
      const distanceScore = (option.route.distance || 0) / 1000; // Distance in km (low weight)
      
      const totalScore = severityScore + maxSeverityScore + zoneCountScore + distanceScore;
      
      return {
        ...option,
        score: totalScore
      };
    });
    
    // Sort by score (lower is better)
    scoredRoutes.sort((a, b) => a.score - b.score);
    
    console.log("Route scoring results:", scoredRoutes.map(r => ({
      type: r.type,
      score: r.score,
      totalSeverity: r.totalSeverity,
      maxSeverity: r.maxSeverity,
      zoneCount: r.intersectingZones.length
    })));
    
    return scoredRoutes[0];
  };

  // NEW: Calculate centroid of multiple zones
const calculateCentroid = (zones) => {
  if (zones.length === 0) return [0, 0];
  
  const sumLng = zones.reduce((sum, zone) => sum + zone.lng, 0);
  const sumLat = zones.reduce((sum, zone) => sum + zone.lat, 0);
  
  return [sumLng / zones.length, sumLat / zones.length];
};

  // NEW: Generate severity-based warning messages
  const getSeverityWarningMessage = (totalSeverity, maxSeverity, zoneCount) => {
    // Handle case where route doesn't actually pass through zones
    if (maxSeverity === 0 || totalSeverity === 0) {
      return "Route successfully avoids all danger zones. Safe travel!";
    }
    
    let warningLevel = "";
    let advice = "";
    
    if (maxSeverity >= 4) {
      warningLevel = "HIGH RISK";
      advice = "Keep an eye on surroundings and report immediately if you feel unsafe.";
    } else if (maxSeverity >= 3) {
      warningLevel = "MODERATE RISK";
      advice = "Exercise extreme caution and consider travelling with others.";
    } else {
      warningLevel = "LOW RISK";
      advice = "Stay alert and avoid stopping in marked areas.";
    }
    
    return `Route passes through ${zoneCount} danger zone${zoneCount > 1 ? 's' : ''} (Max severity: ${maxSeverity}/5). \n ${advice}`;
  };

  // Get direct route for analysis
  const getDirectRoute = async (startPos, endPos) => {
    console.log("Requesting direct route...");
    
    if (!mapboxgl.accessToken) {
      throw new Error("Mapbox access token not available");
    }

    const profile = travelMode === 'walking' ? 'walking' : 'driving';
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startPos[0]},${startPos[1]};${endPos[0]},${endPos[1]}?` +
      `geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Direct route request failed:", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Direct route response:", data);
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }
    
    if (data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0] && data.routes[0].legs[0].steps) {
      setRouteSteps(data.routes[0].legs[0].steps);
    }
    return data.routes[0];
  };

  // Calculate robust avoidance route using multiple strategies
  const calculateRobustAvoidanceRoute = async (startPos, endPos, intersectingZones) => {
    console.log("Calculating robust avoidance route...");
    
    // Try simple waypoint strategy first
    for (const zone of intersectingZones) {
      console.log(`Generating waypoints for zone ${zone.id}`);
      const zoneCenter = [zone.lng, zone.lat];
      const safeDistance = zone.radius * 2.5;
      
      // Try waypoints in 8 directions around the zone
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      
      for (const angle of angles) {
        try {
          const waypoint = calculateDestination(zoneCenter, angle, safeDistance);
          console.log(`Trying waypoint at ${angle}°:`, waypoint);
          
          const route = await getRouteWithWaypoints(startPos, endPos, [waypoint]);
          if (route && checkRouteIntersection(route, intersectingZones).length === 0) {
            console.log("✅ Found avoidance route with single waypoint");
            return route;
          }
        } catch (error) {
          console.log(`Waypoint at ${angle}° failed:`, error.message);
          continue;
        }
      }
    }
    
    console.log("❌ No single waypoint solution found");
    return null;
  };

  // Get route with waypoints
  const getRouteWithWaypoints = async (startPos, endPos, waypoints) => {
    const waypointString = waypoints.map(wp => `;${wp[0]},${wp[1]}`).join('');
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startPos[0]},${startPos[1]}${waypointString};${endPos[0]},${endPos[1]}?` +
      `geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;
    
    console.log("Requesting route with waypoints...");
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Route request failed:", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found with waypoints");
    }
    
    if (data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0] && data.routes[0].legs[0].steps) {
      setRouteSteps(data.routes[0].legs[0].steps);
    }
    return data.routes[0];
  };

  // Draw all danger zones on the map
  const drawAllDangerZones = () => {
    if (!mapLoaded || !map.current) {
      console.log("Cannot draw danger zones - map not ready");
      return;
    }

    console.log("Drawing all danger zones...");
    
    // Clear existing zones first
    clearDangerZones();

    dangerZones.forEach((zone) => {
      drawSingleDangerZone(zone);
    });
    
    console.log(`Drew ${dangerZones.length} danger zones`);
  };

  const clearDangerZones = () => {
    if (!map.current) return;
    
    // Remove all existing danger zone layers and sources, but NEVER remove user location layers/sources
    const layers = map.current.getStyle().layers || [];
    layers.forEach(layer => {
      if (layer.id.startsWith('danger-zone-')) {
        if (map.current.getLayer(layer.id)) {
          map.current.removeLayer(layer.id);
        }
        const sourceId = layer.source;
        if (sourceId && sourceId.startsWith('danger-zone-')) {
          map.current.removeSource(sourceId);
        }
      }
      // Do NOT remove any layer/source with 'user-location' or 'mapbox-user-location' in the id
    });
  };

  const drawSingleDangerZone = (zone) => {
    const sourceId = `danger-zone-${zone.id}`;
    const fillId = `${sourceId}-fill`;
    const outlineId = `${sourceId}-outline`;

    try {
      // Create circle polygon
      const points = [];
      const numPoints = 32;
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const point = calculateDestination([zone.lng, zone.lat], angle * 180 / Math.PI, zone.radius);
        points.push(point);
      }
      points.push(points[0]); // Close the polygon

      // Add source
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [points]
          },
          properties: zone
        }
      });

      // Add layers with severity-based coloring
      const zoneColor = getZoneColor(zone.severity);
      
      map.current.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': zoneColor,
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': zoneColor,
          'line-width': 0.8,
          'line-opacity': 0.8
        }
      });

      // Add interactivity
      addZoneInteractivity(fillId, zone);

    } catch (error) {
      console.error(`Error drawing zone ${zone.id}:`, error);
    }
  };

  const getZoneColor = (severity) => {
    const colors = [
      '#bbff00', // 1 - light green
      '#aaff00',
      '#ffff00', // 3 - yellow
      '#ffaa00',
      '#ff0000'  // 5 - red
    ];
    return colors[Math.min(4, Math.max(0, (severity || 1) - 1))];
  };

  // Store the currently open popup
  const currentZonePopup = useRef(null);

  const addZoneInteractivity = (layerId, zone) => {
    if (!map.current) return;

    map.current.on('click', layerId, (e) => {
      // Format date if available
      let dateStr = '';
      if (zone.createdAt) {
        const dateObj = new Date(zone.createdAt);
        dateStr = dateObj.toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Use type of crime if available
      const crimeType = zone.type || 'Danger Zone';
      const severity = zone.severity || 1;

      // Close previous popup if open
      if (currentZonePopup.current) {
        currentZonePopup.current.remove();
        currentZonePopup.current = null;
      }
      // Create popup with close button
      const popup = new mapboxgl.Popup({ 
      closeButton: false,
      className: 'danger-popup',
      maxWidth: 'none'
    })
      .setLngLat([zone.lng, zone.lat])
      .setHTML(`
        <div class="danger-popup-header">
          <div class="danger-popup-title">
            <span>${crimeType.toUpperCase()}</span>
          </div>
          <button class="danger-popup-close" id="zone-popup-close">&times;</button>
        </div>
        <div class="danger-popup-content">
          <div class="danger-popup-meta">
            <div class="danger-popup-severity">
              <span>Severity:</span>
              <span class="severity-indicator severity-${severity}"></span>
              <span>${severity}/5</span>
            </div>
            ${dateStr ? `<div class="danger-popup-date">${dateStr}</div>` : ''}
          </div>
          
          ${zone.description ? `
            <div class="danger-popup-description">
              ${zone.description}
            </div>
          ` : 'No description to show.'}
          </div>
        </div>
      `)
      .addTo(map.current);
      currentZonePopup.current = popup;
      // Add close button handler after popup is added to DOM
      setTimeout(() => {
        const closeBtn = document.getElementById('zone-popup-close');
        if (closeBtn) {
          closeBtn.onclick = () => {
            popup.remove();
            currentZonePopup.current = null;
          };
        }
      }, 100);
    });

    map.current.on('mouseenter', layerId, () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', layerId, () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  // Robust intersection detection using proper geographic calculations
  const checkRouteIntersection = (route, dangerZones) => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return [];
    }

    const intersectingZones = [];
    const coordinates = route.geometry.coordinates;

    dangerZones.forEach((zone) => {
      const zoneCenter = [zone.lng, zone.lat];
      const radiusInMeters = zone.radius;

      // Check each segment of the route
      let intersectionFound = false;
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];

        if (lineIntersectsCircle(start, end, zoneCenter, radiusInMeters)) {
          intersectionFound = true;
          break;
        }
      }

      if (intersectionFound) {
        intersectingZones.push(zone);
      }
    });

    return intersectingZones;
  };

  // Accurate line-circle intersection using Haversine distance
  const lineIntersectsCircle = (start, end, center, radiusInMeters) => {
    // Check if either endpoint is within the circle
    const distanceToStart = haversineDistance(start, center);
    const distanceToEnd = haversineDistance(end, center);
    
    if (distanceToStart <= radiusInMeters || distanceToEnd <= radiusInMeters) {
      return true;
    }
    
    // Check if the line segment passes through the circle
    const closestPoint = getClosestPointOnLineSegment(start, end, center);
    const distanceToClosest = haversineDistance(closestPoint, center);
    
    return distanceToClosest <= radiusInMeters;
  };

  // Calculate Haversine distance between two points in meters
  const haversineDistance = (point1, point2) => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = point1[1] * Math.PI / 180;
    const lat2 = point2[1] * Math.PI / 180;
    const deltaLat = (point2[1] - point1[1]) * Math.PI / 180;
    const deltaLng = (point2[0] - point1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Find closest point on line segment to a given point
  const getClosestPointOnLineSegment = (start, end, point) => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    
    if (dx === 0 && dy === 0) return start;
    
    const t = Math.max(0, Math.min(1, 
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)
    ));
    
    return [
      start[0] + t * dx,
      start[1] + t * dy
    ];
  };

  // Calculate bearing between two points
  const calculateBearing = (start, end) => {
    const lat1 = start[1] * Math.PI / 180;
    const lat2 = end[1] * Math.PI / 180;
    const deltaLng = (end[0] - start[0]) * Math.PI / 180;
    
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    // Normalize to 0-360
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  const drawRoute = (routeData, color = '#3a86ff', severityInfo = null) => {
    if (!mapLoaded || !routeData || !map.current) {
      console.log("Cannot draw route - map not ready");
      return;
    }

    try {
      console.log("Drawing route with color:", color);

      routeCoordinatesRef.current = routeData.geometry.coordinates;
      setUserProgressIndex(0);
      
      // Remove existing route
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add new route with dynamic styling based on severity
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: severityInfo || {},
          geometry: routeData.geometry
        }
      });

      // Determine line width based on severity
      let lineWidth = 6;
      if (severityInfo && severityInfo.maxSeverity >= 4) {
        lineWidth = 8; // Thicker line for high-risk routes
      } else if (severityInfo && severityInfo.maxSeverity >= 3) {
        lineWidth = 7; // Medium thickness for moderate risk
      }

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': lineWidth,
          'line-opacity': 0.8
        }
      });

      // Add route outline for high-risk routes
      if (severityInfo && severityInfo.maxSeverity >= 4) {
        map.current.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': lineWidth + 2,
            'line-opacity': 0.5
          }
        }, 'route'); // Add below the main route layer
      }

      if (routeData && routeData.distance) {
        setRemainingDistance(routeData.distance);
      } else {
        setRemainingDistance(null);
      }

      console.log("✅ Route drawn successfully");
    } catch (error) {
      console.error("Error drawing route:", error);
    }
  };

  // 4. Add new helper functions:
  const createNavigationMarker = (position, heading) => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width: 20px; 
        height: 20px; 
        background: #00FF00;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(${heading - 45}deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `;
    
    return new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(position);
  };

  const handleStartNavigation = () => {
    if (geolocateControlRef.current) {
      console.log("Triggering geolocation");
      geolocateControlRef.current.trigger(); // Start tracking
      setIsNavigating(true);
      setShouldCalculateRoute(true);
      setOpenOnce(false);
      setOpenOnce(true);
    }
    // Start browser geolocation watch for real-time updates
    if (navigator.geolocation && !positionWatchId.current) {
      positionWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = [position.coords.longitude, position.coords.latitude];
          setCurrentPosition(newPosition);
          map.current.setCenter(newPosition);
        },
        (error) => {
          setLocationError(getLocationErrorMessage(error));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 100,
          timeout: 10000
        }
      );
    }
  };
   
  const handleStopNavigation = () => {
    // Only stop route logic, do not stop user location tracking or remove the GeolocateControl
    setIsNavigating(false);
    if (positionWatchId.current !== null) {
      navigator.geolocation.clearWatch(positionWatchId.current);
      positionWatchId.current = null;
    }
    // Clear route if exists
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
      if (map.current.getLayer('route-outline')) {
        map.current.removeLayer('route-outline');
      }
    }
    // Clear distance and time
    setRemainingDistance(null);
  };

  const updateDestinationMarker = async (position) => {
    if (!mapLoaded || !destinationMarker.current) return;
    
    console.log("Updating destination marker:", position);
    destinationMarker.current
      .setLngLat(position)
      .setPopup(new mapboxgl.Popup().setHTML("<b>Destination</b>"))
      .addTo(map.current);
  };

  const calculateDestination = (start, bearing, distance) => {
    const R = 6371000;
    const lat1 = start[1] * Math.PI / 180;
    const lng1 = start[0] * Math.PI / 180;
    const bearingRad = bearing * Math.PI / 180;
    
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) +
                Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad));
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return [lng2 * 180 / Math.PI, lat2 * 180 / Math.PI];
  };

  const getLocationErrorMessage = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED: return "Location access denied by user";
      case error.POSITION_UNAVAILABLE: return "Location information unavailable";
      case error.TIMEOUT: return "Location request timed out";
      default: return "An unknown error occurred";
    }
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const coords = [place.geometry.location.lng(), place.geometry.location.lat()];
      setDestination(coords);
      setEnd(coords);
    }
  };

  const ResponsiveRouteInfoCard = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(1),
    left: theme.spacing(1),
    zIndex: 10,
    padding: theme.spacing(1),
    borderRadius: '10px',
    boxShadow: theme.shadows[3],
    backgroundColor: theme.palette.background.paper + 'e6',
    backdropFilter: 'blur(2px)',
    minWidth: '90px',
    maxWidth: '90vw',
    [theme.breakpoints.up('sm')]: {
      minWidth: '160px',
      padding: theme.spacing(2),
      borderRadius: '12px',
      boxShadow: theme.shadows[5],
      backgroundColor: theme.palette.background.paper + 'cc',
      backdropFilter: 'blur(4px)',
    }
  }));

  const ResponsiveRouteLegend = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(8),
    right: theme.spacing(0.5),
    zIndex: 10,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: theme.spacing(1.5),
    minWidth: { xs: '100px', sm: '110px', md: '120px' },
    maxWidth: { xs: '110px', sm: '130px', md: '140px' },
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2),
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    },
    [theme.breakpoints.up('md')]: {
      padding: theme.spacing(2.5),
    }
  }));

  const ResponsiveWarningAlert = styled(Paper)(({ severity, theme }) => ({
    backgroundColor: 
      severity === 'high' ? theme.palette.error.light :
      severity === 'medium' ? theme.palette.warning.light :
      theme.palette.success.light,
    color: 
      severity === 'high' ? theme.palette.error.contrastText :
      severity === 'medium' ? theme.palette.warning.contrastText :
      theme.palette.success.contrastText,
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
  }));

  if (initializationPhase) {
  return (
    <Box sx={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      p: { xs: 2, sm: 3 }
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3, md: 4 },
          maxWidth: 500,
          width: '100%',
          borderRadius: 3,
          background: 'white',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          position: 'relative',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #5e35b1 0%, #3949ab 100%)'
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex',
            p: 2,
            borderRadius: '50%',
            background: 'rgba(94, 53, 177, 0.1)',
            mb: 2
          }}>
            <LocationIcon 
              sx={{ 
                fontSize: 40,
                color: 'primary.main'
              }} 
            />
          </Box>
          <Typography 
            variant="h5" 
            gutterBottom 
            sx={{ 
              mb: 1,
              fontWeight: 700,
              color: 'text.primary'
            }}
          >
            Plan Your Safe Route
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            Enter your destination to find the safest travel path
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
              fontWeight: 600
            }}
          >
            <Box 
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
                fontSize: 14,
                fontWeight: 700
              }}
            >
              1
            </Box>
            Destination
          </Typography>
          {isLoaded ? (
            <Autocomplete
              onLoad={ac => (autocompleteRef.current = ac)}
              onPlaceChanged={handlePlaceChanged}
              options={{ componentRestrictions: { country: 'pk' } }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Where are you going?"
                inputRef={inputRef}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon color="primary" />
                    </InputAdornment>
                  ),
                  sx: {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.1)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main'
                    }
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'white'
                  }
                }}
              />
            </Autocomplete>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 2,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: 2,
              background: 'white',
              minHeight: 56
            }}>
              <CircularProgress size={20} sx={{ mr: 1.5 }} />
              <Typography variant="body2" color="text.secondary">
                Loading search...
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
              fontWeight: 600
            }}
          >
            <Box 
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
                fontSize: 14,
                fontWeight: 700
              }}
            >
              2
            </Box>
            Travel Mode
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant={travelMode === 'driving' ? 'contained' : 'outlined'}
                startIcon={<DriveIcon />}
                onClick={() => setTravelMode('driving')}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  borderColor: travelMode === 'driving' ? 'primary.main' : 'grey.300',
                  fontWeight: 600,
                  color: travelMode === 'driving' ? 'white' : 'text.primary',
                  bgcolor: travelMode === 'driving' ? 'primary.main' : 'transparent',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: travelMode === 'driving' ? 'primary.dark' : 'rgba(94, 53, 177, 0.05)'
                  }
                }}
              >
                Drive
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant={travelMode === 'walking' ? 'contained' : 'outlined'}
                startIcon={<WalkIcon />}
                onClick={() => setTravelMode('walking')}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  borderColor: travelMode === 'walking' ? 'primary.main' : 'grey.300',
                  fontWeight: 600,
                  color: travelMode === 'walking' ? 'white' : 'text.primary',
                  bgcolor: travelMode === 'walking' ? 'primary.main' : 'transparent',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: travelMode === 'walking' ? 'primary.dark' : 'rgba(94, 53, 177, 0.05)'
                  }
                }}
              >
                Walk
              </Button>
            </Grid>
          </Grid>
        </Box>

        {loadError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            Failed to load Google Maps API. Please refresh the page and try again.
          </Alert>
        )}

        {locationError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {locationError}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          sx={{ 
             mt: 'auto',
            py: 1.5,
            fontWeight: 600,
            bgcolor: '#6A1B9A',
            border: '2px solid #6A1B9A', // purple outline
            color: 'white',
            '&:hover': {
              bgcolor: '#4A148C',
              transform: 'translateY(-1px)',
              borderColor: '#4A148C'
            },
            transition: 'all 0.2s ease'
          }}
          onClick={handleInitializeMap}
          disabled={!destination || !isLoaded}
        >
          Find Safe Route
        </Button>
      </Paper>
    </Box>
  );
}

const handleRecenter = () => {
  if (map.current && currentPosition) {
    map.current.flyTo({
      center: currentPosition,
      zoom: 16,
      essential: true
    });
  }
};

return (
  <>
    {/* Prevent scrollbars on the whole app */}
    <style>{`
      html, body, #root {
        width: 100vw !important;
        height: 100vh !important;
        min-width: 100vw !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      @keyframes slideInDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      .danger-popup {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      font-family: 'Roboto', sans-serif;
      max-width: 280px;
    }
    
    .danger-popup-header {
      padding: 12px 16px;
      background-color: ${theme.palette.warning.main};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .danger-popup-title {
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .danger-popup-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.4rem;
      cursor: pointer;
      padding: 4px;
      margin: -4px;
      line-height: 1;
    }
    
    .danger-popup-content {
      padding: 16px;
      background: white;
    }
    
    .danger-popup-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }
    
    .danger-popup-severity {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }
    
    .severity-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .danger-popup-date {
      color: #666;
      font-size: 0.85rem;
    }
    
    .danger-popup-description {
      margin: 12px 0;
      line-height: 1.5;
      color: #333;
    }
    
    .danger-popup-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    
    .danger-popup-btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    
    .danger-popup-btn-report {
      background-color: #f5f5f5;
      color: #333;
    }
    
    .danger-popup-btn-report:hover {
      background-color: #e0e0e0;
    }
    
    .danger-popup-btn-emergency {
      background-color: #f44336;
      color: white;
    }
    
    .danger-popup-btn-emergency:hover {
      background-color: #d32f2f;
    }
    
    .severity-1 { background-color: #bbff00; }
    .severity-2 { background-color: #aaff00; }
    .severity-3 { background-color: #ffff00; }
    .severity-4 { background-color: #ffaa00; }
    .severity-5 { background-color: #ff0000; }
    `}</style>
    {/* Main container with responsive gap */}
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        minWidth: '100vw',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        pt: { xs: 2, sm: 5, md: 7, lg: 10 }, // More gap at top
        pb: { xs: 6, sm: 5, md: 7, lg: 10 }, // More gap at bottom
        px: { xs: 1.5, sm: 3, md: 4, lg: 6 }, // Keep side gap
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}
    >
      {/* Inner content box with all overlays and map */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: { xs: 2, sm: 3, md: 4 },
          boxShadow: 6,
          overflow: 'hidden',
          position: 'relative',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Map Container */}
        <Box
          ref={mapContainer}
          sx={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
 
        {/* Top Bar for Directions */}
        {isNavigating && routeSteps.length > 0 && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'rgba(76, 0, 128, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            p: { xs: 1, sm: 1.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: { xs: 60, sm: 70 }
          }}>
            {/* Stop Navigation Button (Top Left) */}
            <IconButton
              onClick={handleStopNavigation}
              sx={{
                color: 'white',
                bgcolor: 'rgb(255, 23, 7)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.99)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>

            {/* Directions Content */}
            <Box sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              px: 2
            }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    color: 'white'
                  }}
                >
                  {routeSteps[0]?.maneuver?.instruction || 'Continue straight'}
                </Typography>
                {routeSteps[0]?.distance > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                      color: 'white'
                    }}
                  >
                    {routeSteps[0].distance >= 1000
                      ? `${(routeSteps[0].distance / 1000).toFixed(1)} km`
                      : `${Math.round(routeSteps[0].distance)} m`}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Empty space to balance the layout */}
            <Box sx={{ width: 48 }} />
          </Box>
        )}

        {/* Bottom Bar for Remaining Distance */}
        {isNavigating && remainingDistance !== null && (
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: 70, sm: 80 }
          }}>
            {/* Distance Info */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ 
                display: 'block', 
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                mb: 0.5
              }}>
                Remaining Distance
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  lineHeight: 1.1,
                  color: 'primary.main'
                }}
              >
                {remainingDistance >= 1000
                  ? `${(remainingDistance / 1000).toFixed(1)} km`
                  : `${Math.round(remainingDistance)} m`}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ 
                fontSize: { xs: '0.6rem', sm: '0.7rem' } 
              }}>
                {travelMode === 'walking' ? 'Walking' : 'Driving'} route
              </Typography>
            </Box>
          </Box>
        )}

        {/* Emergency and Report Buttons (Right Side) */}
        {isNavigating && (
          <Box sx={{
            position: 'absolute',
            bottom: { xs: 90, sm: 100 },
            right: { xs: 16, sm: 24 },
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {/* Emergency Button */}
            <IconButton
              onClick={() => window.open(`tel: ${emergencyNumber}`)}
              sx={{
                color: 'white',
                bgcolor: 'error.main',
                width: 48,
                height: 48,
                boxShadow: 3,
                '&:hover': {
                  bgcolor: 'error.dark',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <PhoneIcon />
            </IconButton>

            {/* Report Button */}
            <IconButton
              onClick={() => navigate('/report-crime')}
              sx={{
                color: 'white',
                bgcolor: 'warning.main',
                width: 48,
                height: 48,
                boxShadow: 3,
                '&:hover': {
                  bgcolor: 'warning.dark',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ReportIcon />
            </IconButton>
          </Box>
        )}

        {/* Route Information Card - REMOVED */}
        {/* Route Legend */}
        {isNavigating && (
          <ResponsiveRouteLegend data-overlay="legend">
            {/* Legend Grid */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 0.5, sm: 0.8 },
              alignItems: 'center'
            }}>
              {/* Normal */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 0.3,
                p: 0.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(58, 134, 255, 0.05)',
                  transform: 'scale(1.02)'
                }
              }}>
                <Box sx={{ 
                  width: { xs: 14, sm: 16 }, 
                  height: { xs: 14, sm: 16 }, 
                  borderRadius: '50%', 
                  bgcolor: '#3a86ff',
                  boxShadow: '0 2px 8px rgba(58, 134, 255, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  Normal
                </Typography>
              </Box>

              {/* Safe */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 0.3,
                p: 0.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 255, 0, 0.05)',
                  transform: 'scale(1.02)'
                }
              }}>
                <Box sx={{ 
                  width: { xs: 14, sm: 16 }, 
                  height: { xs: 14, sm: 16 }, 
                  borderRadius: '50%', 
                  bgcolor: '#00ff00',
                  boxShadow: '0 2px 8px rgba(0, 255, 0, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  Safe
                </Typography>
              </Box>

              {/* Low Risk */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 0.3,
                p: 0.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 102, 0, 0.05)',
                  transform: 'scale(1.02)'
                }
              }}>
                <Box sx={{ 
                  width: { xs: 14, sm: 16 }, 
                  height: { xs: 14, sm: 16 }, 
                  borderRadius: '50%', 
                  bgcolor: '#ff6600',
                  boxShadow: '0 2px 8px rgba(255, 102, 0, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  Low Risk
                </Typography>
              </Box>

              {/* High Risk */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 0.3,
                p: 0.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 0, 0, 0.05)',
                  transform: 'scale(1.02)'
                }
              }}>
                <Box sx={{ 
                  width: { xs: 14, sm: 16 }, 
                  height: { xs: 14, sm: 16 }, 
                  borderRadius: '50%', 
                  bgcolor: '#ff0000',
                  boxShadow: '0 2px 8px rgba(255, 0, 0, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  High Risk
                </Typography>
              </Box>
            </Box>
          </ResponsiveRouteLegend>
        )}

        {/* Warning Alert as Toast (bottom center) */}
        {riskWarning && (
          <Snackbar
            open={warningOpen}
            autoHideDuration={6000}
            onClose={() => setWarningOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{
              bottom: { xs: 80, sm: 100 },
            }}
          >
            <ResponsiveWarningAlert
              severity={
                riskWarning.level.includes('HIGH') ? 'high' :
                  riskWarning.level.includes('MODERATE') ? 'medium' : 'low'
              }
            >
              {riskWarning.level.includes('HIGH') ? <ErrorIcon fontSize="small" /> :
                riskWarning.level.includes('MODERATE') ? <WarningIcon fontSize="small" /> : 
                <CheckCircleIcon fontSize="small" />}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {riskWarning.level}
                  </Typography>
                  <Typography variant="body2">
                    {riskWarning.message}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={() => setWarningOpen(false)}
                  sx={{ ml: 1 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
            </ResponsiveWarningAlert>
          </Snackbar>
        )}

        {/* Navigation Controls - UPDATED */}
        {currentPosition && !isNavigating && (
          <Box sx={{
            position: 'absolute',
            bottom: { xs: 16, sm: 32 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: { xs: '96%', sm: 'auto' },
            maxWidth: { xs: '98%', sm: '400px' },
            px: { xs: 0, sm: 0 }
          }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<LocationIcon fontSize={window.innerWidth < 600 ? "small" : "medium"} />}
              onClick={handleStartNavigation}
              sx={{
                borderRadius: '24px',
                boxShadow: 3,
                px: { xs: 1, sm: 4 },
                py: { xs: 0.5, sm: 1.5 },
                fontWeight: 'bold',
                width: '100%',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                minHeight: { xs: '36px', sm: '48px' }
              }}
              fullWidth
            >
              <Typography sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                Start Navigation
              </Typography>
            </Button>
          </Box>
        )}

        {/* Emergency Button (bottom right) - REMOVED - now in top bar */}
        {/* Report Button (bottom left) - REMOVED - now in bottom bar */}

        {/* Loading Danger Zones Overlay */}
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: { xs: 8, sm: 20 },
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'background.paper',
            p: { xs: 1, sm: 1.5 },
            borderRadius: 1,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            zIndex: 20,
            minWidth: { xs: '120px', sm: '180px' }
          }}>
            <CircularProgress size={18} sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
              Loading danger zones...
            </Typography>
          </Box>
        )}

        {/* Route Safety Change Notification */}
        {routeSafetyChange && (
          <Box sx={{
            position: 'absolute',
            top: { xs: 80, sm: 100 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            bgcolor: 'background.paper',
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            boxShadow: 3,
            minWidth: { xs: '200px', sm: 250 },
            textAlign: 'center',
            border: '2px solid',
            borderColor: routeSafetyChange.to >= 4 ? 'error.main' : 
                        routeSafetyChange.to >= 3 ? 'warning.main' : 
                        routeSafetyChange.to >= 1 ? 'warning.light' : 'success.main',
            animation: 'slideInDown 0.5s ease-out'
          }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                color: routeSafetyChange.to >= 4 ? 'error.main' : 
                       routeSafetyChange.to >= 3 ? 'warning.main' : 
                       routeSafetyChange.to >= 1 ? 'warning.light' : 'success.main'
              }}
            >
              Route Safety Changed
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                fontSize: { xs: '0.7rem', sm: '0.8rem' }
              }}
            >
              {routeSafetyChange.to >= 4 ? 'High Risk' : 
               routeSafetyChange.to >= 3 ? 'Moderate Risk' : 
               routeSafetyChange.to >= 1 ? 'Low Risk' : 'Safe Route'}
            </Typography>
          </Box>
        )}

        {/* Route Steps (mobile only) - REMOVED - now in top bar */}
      </Box>
    </Box>
    <Modal
      open={hasArrived}
      aria-labelledby="arrival-title"
      aria-describedby="arrival-desc"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
    >
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 6,
        p: 4,
        minWidth: 260,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2
      }}>
        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
        <Box id="arrival-title" sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 1 }}>
          Congrats on reaching your destination safely!
        </Box>
      </Box>
    </Modal>
    <Modal
      open={openOnce}
      aria-labelledby="route-loading-title"
      aria-describedby="route-loading-desc"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
    >
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 6,
        p: 4,
        minWidth: 260,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2
      }}>
        <CircularProgress color="primary" size={36} thickness={4} />
        <Box id="route-loading-title" sx={{ fontWeight: 600, fontSize: '1.1rem', mt: 1, mb: 0.5 }}>
          Finding the safest route for you...
        </Box>
      </Box>
    </Modal>
  </>
);
}
