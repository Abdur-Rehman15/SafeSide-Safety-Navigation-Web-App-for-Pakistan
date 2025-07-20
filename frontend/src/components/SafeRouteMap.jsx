// LiveRouteMap.jsx - Debugged and Fixed Version
import React, { useEffect, useRef, useState } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { TextField, Button, Typography, Box, Paper, Radio, RadioGroup, FormControlLabel, styled } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import DriveIcon from '@mui/icons-material/DirectionsCar';
import WalkIcon from '@mui/icons-material/DirectionsWalk';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LiveRouteMap({ end: propEnd }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const autocompleteRef = useRef();
  const inputRef = useRef();
  const userMarker = useRef(null);
  const destinationMarker = useRef(null);
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
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [userHeading, setUserHeading] = useState(0);
  const [shouldCalculateRoute, setShouldCalculateRoute] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [currentRouteColor, setCurrentRouteColor] = useState('blue');
  const [warningOpen, setWarningOpen] = useState(true);
  const [isMapCentered, setIsMapCentered] = useState(true);
  const recenterButtonRef = useRef(null);
  const [hasArrived, setHasArrived] = useState(false);
  
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

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    if (!mapboxgl.accessToken) {
      setLocationError("Map configuration error. Please check your API keys.");
      return;
    }
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [74.255, 31.39],
      zoom: 13
    });
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.ScaleControl());
    userMarker.current = new mapboxgl.Marker({ color: '#00FF00' });
    destinationMarker.current = new mapboxgl.Marker({ color: '#FF0000' });
    map.current.on('load', () => {
      setMapLoaded(true);
      setTimeout(() => {
        startPositionTracking();
      }, 100);
    });
    map.current.on('error', (e) => {
      setLocationError("Failed to load map. Please refresh the page.");
    });
    return () => {
      if (positionWatchId.current) {
        navigator.geolocation.clearWatch(positionWatchId.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Danger zones fetch
  useEffect(() => {
    if (!currentPosition) return;
    const fetchDangerZones = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/report/all-reports', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        const zones = response.data.map((report, index) => ({
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
      } finally {
        setLoading(false);
      }
    };
    fetchDangerZones();
  }, [currentPosition]);

  // Draw danger zones
  useEffect(() => {
    if (mapLoaded && dangerZones.length > 0) {
      drawAllDangerZones();
    }
  }, [mapLoaded, dangerZones]);

  // Route calculation
  useEffect(() => {
    if (!mapLoaded || !currentPosition || !end || !shouldCalculateRoute) return;
    const updateMap = async () => {
      try {
        await updateDestinationMarker(end);
        await updateRouteWithAvoidance(currentPosition, end);
      } catch (error) {
        setLocationError("Failed to calculate route. Please try again.");
      }
    };
    updateMap();
  }, [mapLoaded, currentPosition, end, dangerZones, shouldCalculateRoute]);

  useEffect(() => {
    if (propEnd) setEnd(propEnd);
  }, [propEnd]);

  const initializeMap = () => {
    if (map.current || !mapContainer.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: currentPosition || [74.255, 31.39],
      zoom: 13
    });
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.ScaleControl());
    userMarker.current = new mapboxgl.Marker({ color: '#00FF00' });
    destinationMarker.current = new mapboxgl.Marker({ color: '#FF0000' });
    map.current.on('load', () => {
      setMapLoaded(true);
      startPositionTracking();
      if (destination) updateDestinationMarker(destination);
    });
    return () => {
      if (positionWatchId.current) navigator.geolocation.clearWatch(positionWatchId.current);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  };

  // Route calculation logic
  const updateRouteWithAvoidance = async (startPos, endPos) => {
    if (!mapLoaded || !map.current) return;
    try {
      // Direct route
      const directRoute = await getDirectRoute(startPos, endPos);
      if (dangerZones.length === 0) {
        drawRoute(directRoute, '#3a86ff');
        return;
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
          message: "You are starting or ending in a danger zone area. Exercise caution.",
          color: "bg-yellow-100 text-yellow-800"
        } : null);
        setRouteCalculated(true);
        return;
      }

      // Try avoidance route
      // Try avoidance route
      const avoidanceRoute = await calculateRobustAvoidanceRoute(startPos, endPos, intersectingZones);
      if (avoidanceRoute) {
        const avoidanceIntersections = checkRouteIntersection(avoidanceRoute, intersectingZones);
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        
        if (avoidanceIntersections.length === 0) {
          drawRoute(avoidanceRoute, '#00ff00');
          setRiskWarning({
            level: "✅ SAFE ROUTE",
            message: hasLocationZones
              ? "Route avoids all danger zones, but your start or destination is inside a danger zone. Stay alert at these locations."
              : "Route successfully avoids all danger zones. Safe travels!",
            color: "bg-green-100 text-green-800"
          });
        } else {
          // This is supposed to be an avoidance route but still intersects - shouldn't happen
          // Fall through to find best route instead of using this one
          console.log("Avoidance route still intersects zones, trying best route selection...");
        }
        
        if (avoidanceIntersections.length === 0) {
          setRouteCalculated(true);
          return;
        }
      }

      // If no avoidance route, find best route with severity consideration
      // If no clean avoidance route, find best route with severity consideration
      const bestRoute = await findBestRouteWithSeverityConsideration(startPos, endPos, intersectingZones);
      if (bestRoute && bestRoute.route) {
        // Check if the best route actually intersects with danger zones
        const finalIntersections = checkRouteIntersection(bestRoute.route, intersectingZones);
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        
        if (finalIntersections.length === 0) {
          // Best route is actually clean!
          drawRoute(bestRoute.route, '#00ff00');
          setRiskWarning({
            level: "✅ SAFE ROUTE", 
            message: hasLocationZones 
              ? "Route avoids all danger zones, but your start or destination is inside a danger zone. Stay alert at these locations."
              : "Route successfully avoids all danger zones. Safe travels!",
            color: "bg-green-100 text-green-800"
          });
        } else {
          // Route does pass through danger zones - use severity-based coloring
          const severityColor = bestRoute.maxSeverity >= 4 ? '#ff0000' :
                                bestRoute.maxSeverity >= 3 ? '#ff6600' : '#ffff00';
          drawRoute(bestRoute.route, severityColor);
          const severityWarning = getSeverityWarningMessage(bestRoute.totalSeverity, bestRoute.maxSeverity, finalIntersections.length);
          setRiskWarning({
            level: bestRoute.maxSeverity >= 4 ? "⚠️ HIGH RISK" : bestRoute.maxSeverity >= 3 ? "⚠️ MODERATE RISK" : "⚠️ LOW RISK",
            message: severityWarning,
            color: bestRoute.maxSeverity >= 4 ? "bg-red-100 text-red-800" : bestRoute.maxSeverity >= 3 ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"
          });
        }
        setRouteCalculated(true);
      } else {
        setLocationError("No route found through danger zones.");
      }
    } catch (error) {
      setLocationError("Failed to calculate route. Please check your connection and try again.");
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
  // Fix 3: Update the calculateRouteSeverity function to ensure proper zone filtering

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
      return "Route successfully avoids all danger zones. Safe travels!";
    }
    
    let warningLevel = "";
    let advice = "";
    
    if (maxSeverity >= 4) {
      warningLevel = "⚠️ HIGH RISK";
      advice = "Consider delaying travel or finding alternative transportation.";
    } else if (maxSeverity >= 3) {
      warningLevel = "⚠️ MODERATE RISK";
      advice = "Exercise extreme caution and consider traveling with others.";
    } else {
      warningLevel = "⚠️ LOW RISK";
      advice = "Stay alert and avoid stopping in marked areas.";
    }
    
    return `Route passes through ${zoneCount} danger zone${zoneCount > 1 ? 's' : ''} (Max severity: ${maxSeverity}/5). ${advice}`;
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
    
    // Remove all existing danger zone layers and sources
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
        dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
      // Use type of crime if available
      const crimeType = zone.type || 'Danger Zone';
      // Close previous popup if open
      if (currentZonePopup.current) {
        currentZonePopup.current.remove();
        currentZonePopup.current = null;
      }
      // Create popup with close button
      const popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat([zone.lng, zone.lat])
        .setHTML(`
          <div style="min-width:180px;max-width:240px;font-family:sans-serif;position:relative;">
            <button id="zone-popup-close" style="position:absolute;top:4px;right:4px;background:transparent;border:none;font-size:1.2rem;cursor:pointer;color:#888;">&times;</button>
            <div style="font-weight:700;font-size:1.1rem;margin-bottom:2px;">${crimeType}</div>
            <div style="color:#666;font-size:0.85rem;margin-bottom:4px;">
              <span style="font-weight:500;">Severity:</span> <span style="color:#b71c1c;">${zone.severity || 1}/5</span>
            </div>
            ${dateStr ? `<div style='color:#888;font-size:0.8rem;margin-bottom:4px;'><span style='font-weight:500;'>Posted:</span> ${dateStr}</div>` : ''}
            <div style="font-size:0.95rem;margin-top:4px;">${zone.description || ''}</div>
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

  // Draw route on the map with color coding
  // Enhanced route drawing with severity-based color coding
  const drawRoute = (routeData, color = '#3a86ff', severityInfo = null) => {
    if (!mapLoaded || !routeData || !map.current) {
      console.log("Cannot draw route - map not ready");
      return;
    }

    try {
      console.log("Drawing route with color:", color);
      
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

      // --- NEW: Update remaining distance ---
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

  const startPositionTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    console.log("Starting position tracking...");
    
    navigator.geolocation.getCurrentPosition(
      handleNewPosition,
      (error) => {
        console.error("Initial geolocation error:", error);
        setLocationError(getLocationErrorMessage(error));
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    positionWatchId.current = navigator.geolocation.watchPosition(
      handleNewPosition,
      (error) => {
        console.error("Geolocation watch error:", error);
        setLocationError(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000
      }
    );
  };

  const handleNewPosition = (position) => {
    const newPosition = [
      position.coords.longitude,
      position.coords.latitude
    ];
    
    console.log("New position:", newPosition);
    
    // Update heading if available and navigating
    if (isNavigating && position.coords.heading !== null && position.coords.heading !== undefined) {
      setUserHeading(position.coords.heading);
    }
    
    setCurrentPosition(newPosition);
    setLocationError(null);

    if (map.current && userMarker.current) {
      // Update marker based on navigation state
      if (isNavigating) {
        // Remove existing marker and create navigation arrow
        userMarker.current.remove();
        userMarker.current = createNavigationMarker(newPosition, userHeading);
        userMarker.current.addTo(map.current);
        // Keep map centered on user if isMapCentered is true
        if (isMapCentered) {
          map.current.flyTo({
            center: newPosition,
            zoom: 16,
            essential: true
          });
        }
      } else {
        userMarker.current
          .setLngLat(newPosition)
          .addTo(map.current);
      }
      
      if (!end) {
        map.current.flyTo({
          center: newPosition,
          zoom: 14,
          essential: true
        });
      }
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
    setIsNavigating(true);
    setShouldCalculateRoute(true); // This will trigger route calculation
    // Request high accuracy positioning for navigation
    if (positionWatchId.current) {
      navigator.geolocation.clearWatch(positionWatchId.current);
    }
    positionWatchId.current = navigator.geolocation.watchPosition(
      handleNewPosition,
      (error) => {
        console.error("Navigation geolocation error:", error);
        setLocationError(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 500, // More frequent updates for navigation
        timeout: 10000
      }
    );
    // Center map on user immediately
    if (map.current && currentPosition) {
      map.current.flyTo({
        center: currentPosition,
        zoom: 16,
        essential: true
      });
      setIsMapCentered(true);
    }
  };

  // 4. MODIFY THE STOP NAVIGATION HANDLER (replace your existing handleStopNavigation function)
  const handleStopNavigation = () => {
    setIsNavigating(false);
    setShouldCalculateRoute(false); // Stop route calculations
    setRouteCalculated(false); // Reset route calculated state
    setRiskWarning(null); // Clear any risk warnings
    setUserHeading(0);
    
    // Clear the route from map
    if (map.current && map.current.getSource('route')) {
      map.current.removeLayer('route');
      if (map.current.getLayer('route-outline')) {
        map.current.removeLayer('route-outline');
      }
      map.current.removeSource('route');
    }
    
    // Restart normal position tracking
    if (positionWatchId.current) {
      navigator.geolocation.clearWatch(positionWatchId.current);
    }
    
    startPositionTracking();
    
    // Reset marker to normal green dot
    if (map.current && userMarker.current && currentPosition) {
      userMarker.current.remove();
      userMarker.current = new mapboxgl.Marker({ 
        color: '#00FF00',
        className: 'user-marker'
      });
      userMarker.current.setLngLat(currentPosition).addTo(map.current);
    }
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

  // Google Places Autocomplete handler
  // Modified Google Places handler
  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const coords = [place.geometry.location.lng(), place.geometry.location.lat()];
      setDestination(coords);
      setEnd(coords);
    }
  };

  // Add these styled components at the top of your file
  // Replace the RouteInfoCard with this responsive version:
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

  // Replace the RouteLegend with this responsive version:
  const ResponsiveRouteLegend = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 10,
    padding: theme.spacing(1),
    borderRadius: '10px',
    backgroundColor: theme.palette.background.paper + 'e6',
    backdropFilter: 'blur(2px)',
    minWidth: '90px',
    maxWidth: '90vw',
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2),
      borderRadius: '12px',
      backgroundColor: theme.palette.background.paper + 'cc',
      backdropFilter: 'blur(4px)',
      minWidth: '120px',
    }
  }));

  // Replace the WarningAlert with this responsive version:
  const ResponsiveWarningAlert = styled(Paper)(({ severity, theme }) => ({
    position: 'absolute',
    top: theme.spacing(65), // Position below the distance box
    left: theme.spacing(1),
    zIndex: 5,
    padding: theme.spacing(1),
    borderRadius: '10px',
    boxShadow: theme.shadows[3],
    backgroundColor: theme.palette.background.paper + 'e6',
    backdropFilter: 'blur(2px)',
    minWidth: '90px',
    width: 'calc(100% - 16px)', // Match distance box width
    maxWidth: '90vw',
    [theme.breakpoints.up('sm')]: {
      top: theme.spacing(1),
      left: '50%',
      transform: 'translateX(-50%)',
      padding: theme.spacing(2),
      borderRadius: '12px',
      boxShadow: theme.shadows[5],
      backgroundColor: theme.palette.background.paper + 'cc',
      backdropFilter: 'blur(4px)',
      minWidth: '160px',
      width: 'auto'
    },
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
    gap: theme.spacing(1)
  }));

  // FIX: Initialization Phase UI
  if (initializationPhase) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        p: 3
      }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
            Plan Your Safe Route
          </Typography>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            1. Enter Your Destination
          </Typography>
          <LoadScript
            googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            libraries={['places']}
          >
            <Autocomplete
              onLoad={ac => (autocompleteRef.current = ac)}
              onPlaceChanged={handlePlaceChanged}
              options={{ componentRestrictions: { country: 'pk' } }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for destination..."
                inputRef={inputRef}
                InputProps={{
                  startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Autocomplete>
          </LoadScript>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            2. Select Travel Mode
          </Typography>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <RadioGroup
              row
              value={travelMode}
              onChange={(e) => setTravelMode(e.target.value)}
              sx={{ justifyContent: 'space-around' }}
            >
              <FormControlLabel
                value="driving"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DriveIcon sx={{ mr: 1 }} />
                    Driving
                  </Box>
                }
              />
              <FormControlLabel
                value="walking"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WalkIcon sx={{ mr: 1 }} />
                    Walking
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
          {locationError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {locationError}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 4, py: 2 }}
            onClick={handleInitializeMap}
            disabled={!destination}
          >
            Plan Safe Route
          </Button>
        </Paper>
      </Box>
    );
  }

  // Add these styled components
const RouteInfoCard = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 10,
  padding: theme.spacing(2),
  borderRadius: '12px',
  boxShadow: theme.shadows[5],
  backgroundColor: theme.palette.background.paper + 'cc',
  backdropFilter: 'blur(4px)',
  minWidth: '200px'
}));

const RouteLegend = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 10,
  padding: theme.spacing(2),
  borderRadius: '12px',
  // boxShadow: theme.shadows[5],
  backgroundColor: theme.palette.background.paper + 'cc',
  backdropFilter: 'blur(4px)'
}));

const WarningAlert = styled(Paper)(({ severity, theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  padding: theme.spacing(2),
  borderRadius: '12px',
  // boxShadow: theme.shadows[5],
  maxWidth: '90%',
  backgroundColor: 
    severity === 'high' ? theme.palette.error.light :
    severity === 'medium' ? theme.palette.warning.light :
    theme.palette.success.light,
  color: 
    severity === 'high' ? theme.palette.error.contrastText :
    severity === 'medium' ? theme.palette.warning.contrastText :
    theme.palette.success.contrastText,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

// Replace the return statement with this enhanced version
// Replace the return statement with this responsive version
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
      `}</style>
      {/* Route calculation loading modal */}
      <Modal
        open={shouldCalculateRoute && !routeCalculated}
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
      {/* Arrival popup */}
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
      <Box sx={{ width: '100vw', height: '100vh', minHeight: '100vh', minWidth: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Map Container */}
      <Box
        ref={mapContainer}
        sx={{ 
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          minWidth: '100vw',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      />

      {/* Route Information Card - Responsive */}
      {remainingDistance !== null && (
        <ResponsiveRouteInfoCard data-overlay="distance">
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
            Remaining Distance
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.7rem' }}>
            Distance
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1rem', sm: '1.5rem' },
              lineHeight: 1.1
            }}
          >
            {remainingDistance >= 1000 
              ? `${(remainingDistance/1000).toFixed(2)} km` 
              : `${Math.round(remainingDistance)} m`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' } }}>
            {travelMode === 'walking' ? 'Walking' : 'Driving'} route
          </Typography>
        </ResponsiveRouteInfoCard>
      )}

      {/* Route Legend - Responsive */}
      <ResponsiveRouteLegend data-overlay="legend">
        <Typography variant="caption" gutterBottom sx={{ display: { xs: 'none', sm: 'block' }, fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
          Route Safety
        </Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 0.5
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3a86ff' }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>Normal</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00ff00' }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>Safe</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff6600' }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>Low Risk</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff0000' }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>High Risk</Typography>
          </Box>
        </Box>
      </ResponsiveRouteLegend>

      {/* Warning Alert - Responsive */}
      {riskWarning && warningOpen && (
        <ResponsiveWarningAlert 
          severity={
            riskWarning.level.includes('HIGH') ? 'high' : 
            riskWarning.level.includes('MODERATE') ? 'medium' : 'low'
          }
        >
          {riskWarning.level.includes('HIGH') ? <ErrorIcon fontSize="small" /> :
          riskWarning.level.includes('MODERATE') ? <WarningIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '0.8rem', sm: '0.9rem' }
            }}>
              {riskWarning.level}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
              {riskWarning.message}
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, ml: 'auto' }}>
            <CloseIcon 
              fontSize="small" 
              sx={{ cursor: 'pointer' }} 
              onClick={() => setWarningOpen(false)} 
            />
          </Box>
        </ResponsiveWarningAlert>
      )}

      {/* Add margin to overlays so they don't overlap with warning box on mobile */}
      <style>{`
        @media (max-width: 600px) {
          .MuiPaper-root[data-overlay="legend"] {
            margin-top: 38px !important;
          }
        }
      `}</style>

      {/* Navigation Controls - Responsive */}
      {mapLoaded && currentPosition && end && !locationError && (
        <Box sx={{
          position: 'absolute',
          bottom: { xs: 8, sm: 20 },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: { xs: '96vw', sm: 'auto' },
          maxWidth: { xs: '98vw', sm: '400px' },
          px: { xs: 0, sm: 0 }
        }}>
          {!isNavigating ? (
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
          ) : (
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<WarningIcon fontSize={window.innerWidth < 600 ? "small" : "medium"} />}
              onClick={handleStopNavigation}
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
                Stop Navigation
              </Typography>
            </Button>
          )}
        </Box>
      )}
      {/* Recenter button during navigation */}
      {isNavigating && !isMapCentered && (
        <Box sx={{
          position: 'absolute',
          bottom: { xs: 80, sm: 100 },
          right: { xs: 16, sm: 32 },
          zIndex: 20
        }}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleRecenter}
            sx={{ borderRadius: '50%', minWidth: 0, width: 48, height: 48, p: 0, boxShadow: 3 }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" stroke="#fff" strokeWidth="2" fill="#2196f3" />
              <path d="M14 8v8m0 0l4-4m-4 4l-4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </Box>
      )}

      {/* Loading Danger Zones Overlay - Responsive */}
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
    </Box>
    </>
  );
}