// LiveRouteMap.jsx - Fixed Version
import React, { useEffect, useRef, useState } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LiveRouteMap({ end: propEnd }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dangerZones, setDangerZones] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Google Places Autocomplete state
  const autocompleteRef = useRef();
  const inputRef = useRef();
  const [end, setEnd] = useState(propEnd || null);
  const userMarker = useRef(null);
  const destinationMarker = useRef(null);
  const positionWatchId = useRef(null);

  // SINGLE map initialization - removing duplicate
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    console.log("Initializing map...");
    
    // Check if Mapbox token is available
    if (!mapboxgl.accessToken) {
      console.error("Mapbox token not found!");
      setLocationError("Map configuration error. Please check your API keys.");
      return;
    }
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [74.255, 31.39],
      zoom: 13
    });

    // Add controls
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.ScaleControl());

    // Initialize markers
    userMarker.current = new mapboxgl.Marker({ 
      color: '#00FF00',
      className: 'user-marker'
    });

    destinationMarker.current = new mapboxgl.Marker({ 
      color: '#FF0000',
      className: 'destination-marker'
    });

    // Map load handler
    map.current.on('load', () => {
      console.log("Map loaded successfully");
      setMapLoaded(true);
      
      // Start position tracking after map loads
      setTimeout(() => {
        startPositionTracking();
      }, 100);
    });

    // Error handling
    map.current.on('error', (e) => {
      console.error("Map error:", e);
      setLocationError("Failed to load map. Please refresh the page.");
    });

    return () => {
      console.log("Cleaning up map and geolocation...");
      if (positionWatchId.current) {
        navigator.geolocation.clearWatch(positionWatchId.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch danger zones when position changes
  useEffect(() => {
    if (!currentPosition) return;
    
    const fetchDangerZones = async () => {
      try {
        setLoading(true);
        console.log("Fetching danger zones...");
        
        const response = await axios.get('http://localhost:5000/report/all-reports', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        console.log("Danger zones response:", response.data);
        
        // Transform crime reports into danger zones
        const zones = response.data.map((report, index) => ({
          id: report._id || `zone-${index}`,
          lat: report.location.coordinates[1],
          lng: report.location.coordinates[0],
          radius: report.radius || 500,
          severity: report.severity || 1,
          description: report.comments || 'No description'
        }));
        
        console.log("Processed danger zones:", zones);
        setDangerZones(zones);
      } catch (err) {
        console.error("Failed to fetch danger zones:", err);
        setLocationError('Failed to load danger zone data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDangerZones();
  }, [currentPosition]);

  // Draw danger zones when they change or map loads
  useEffect(() => {
    if (mapLoaded && dangerZones.length > 0) {
      console.log("Drawing danger zones...");
      drawAllDangerZones();
    }
  }, [mapLoaded, dangerZones]);
  
  // Handle position updates and route calculation
  useEffect(() => {
    if (!mapLoaded || !currentPosition || !end) {
      console.log("Route calculation skipped:", { mapLoaded, currentPosition: !!currentPosition, end: !!end });
      return;
    }
  
    const updateMap = async () => {
      try {
        console.log("Updating map with route calculation...");
        await updateDestinationMarker(end);
        await updateRouteWithAvoidance(currentPosition, end);
      } catch (error) {
        console.error("Error updating map:", error);
        setLocationError("Failed to calculate route. Please try again.");
      }
    };
  
    updateMap();
  }, [mapLoaded, currentPosition, end, dangerZones]);

  // Update end if propEnd changes
  useEffect(() => {
    if (propEnd) {
      console.log("Updating end position from prop:", propEnd);
      setEnd(propEnd);
    }
  }, [propEnd]);

  // Enhanced route calculation with proper danger zone avoidance
  // Enhanced route calculation with severity-based route selection
  const updateRouteWithAvoidance = async (startPos, endPos) => {
    if (!mapLoaded || !map.current) {
      console.log("Map not ready for route calculation");
      return;
    }

    try {
      console.log("=== ROUTE CALCULATION START ===");
      console.log("Start position:", startPos);
      console.log("End position:", endPos);
      console.log("Danger zones:", dangerZones.length);
      
      // Step 1: Get direct route for analysis
      const directRoute = await getDirectRoute(startPos, endPos);
      console.log("Direct route obtained, distance:", directRoute.distance, "meters");
      
      // If no danger zones, use direct route
      if (dangerZones.length === 0) {
        console.log("✅ No danger zones, using direct route");
        drawRoute(directRoute, '#3a86ff');
        return;
      }
      
      // Step 2: Check if direct route intersects any danger zones
      // Step 2: Identify zones to exclude from route calculation
      const startZones = dangerZones.filter(zone => {
        return haversineDistance([zone.lng, zone.lat], startPos) <= zone.radius;
      });

      const destinationZones = dangerZones.filter(zone => {
        return haversineDistance([zone.lng, zone.lat], endPos) <= zone.radius;
      });

      // Exclude both start and destination zones from route calculation
      const zonesToAvoid = dangerZones.filter(zone => 
        !startZones.includes(zone) && !destinationZones.includes(zone)
      );

      const intersectingZones = checkRouteIntersection(directRoute, zonesToAvoid);

      console.log(`Excluded ${startZones.length} start zones and ${destinationZones.length} destination zones from route calculation`);
      console.log(`Remaining zones to avoid: ${zonesToAvoid.length}`);
      
      console.log(`Found ${intersectingZones.length} intersecting zones (excluding destination zones):`, intersectingZones.map(z => z.id));

      if (intersectingZones.length === 0) {
        // No intersection, use direct route
        console.log("✅ No intersection detected, using direct route");
        const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
        drawRoute(directRoute, hasLocationZones ? '#ff6600' : '#3a86ff');
        return;
      }

      console.log("⚠️ Intersection detected, searching for avoidance route...");

      // Try to find avoidance route
      const avoidanceRoute = await calculateRobustAvoidanceRoute(startPos, endPos, intersectingZones);
      
      if (avoidanceRoute) {
      console.log("✅ Found avoidance route");
      const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
      drawRoute(avoidanceRoute, hasLocationZones ? '#ff6600' : '#00ff00');
    } else {
        console.log("⚠️ No avoidance route found, finding best route through danger zones...");
        
        // NEW: Find the best route through danger zones based on severity
        const bestRoute = await findBestRouteWithSeverityConsideration(startPos, endPos, intersectingZones);
        
        if (bestRoute.route) {
          console.log(`✅ Found best route through danger zones with total severity: ${bestRoute.totalSeverity}`);
          const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
          drawRoute(bestRoute.route, '#ff0000'); // Red color to indicate danger
          
          // Enhanced warning message with severity information
          const severityWarning = getSeverityWarningMessage(bestRoute.totalSeverity, bestRoute.maxSeverity, intersectingZones.length);
          setLocationError(severityWarning);
        } else {
          console.log("❌ No alternative routes found, using direct route");
          drawRoute(directRoute, '#ff0000');
          setLocationError("Warning: Route passes through high-severity danger zones. No alternatives available.");
        }
      }
      
    } catch (error) {
      console.error("Error in route calculation:", error);
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
    const hasLocationZones = startZones.length > 0 || destinationZones.length > 0;
    
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
  const calculateRouteSeverity = (route, dangerZones) => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return { totalSeverity: Infinity, maxSeverity: 5, intersectingZones: [] };
    }

    const intersectingZones = checkRouteIntersection(route, dangerZones);
    
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
  
  return `${warningLevel}: Route passes through ${zoneCount} danger zone${zoneCount > 1 ? 's' : ''} (Max severity: ${maxSeverity}/5). ${advice}`;
};

  // Get direct route for analysis
  const getDirectRoute = async (startPos, endPos) => {
    console.log("Requesting direct route...");
    
    if (!mapboxgl.accessToken) {
      throw new Error("Mapbox access token not available");
    }
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${startPos[0]},${startPos[1]};${endPos[0]},${endPos[1]}?` +
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

  const addZoneInteractivity = (layerId, zone) => {
    if (!map.current) return;

    map.current.on('click', layerId, (e) => {
      new mapboxgl.Popup()
        .setLngLat([zone.lng, zone.lat])
        .setHTML(`
          <strong>Danger Zone</strong><br>
          Severity: ${zone.severity}/5<br>
          ${zone.description}
        `)
        .addTo(map.current);
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
    setCurrentPosition(newPosition);
    setLocationError(null);

    if (map.current && userMarker.current) {
      userMarker.current
        .setLngLat(newPosition)
        .addTo(map.current);
      
      if (!end) {
        map.current.flyTo({
          center: newPosition,
          zoom: 14,
          essential: true
        });
      }
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
  const handlePlaceChanged = () => {
    let place = null;
    if (autocompleteRef.current && typeof autocompleteRef.current.getPlace === 'function') {
      place = autocompleteRef.current.getPlace();
    } else if (window.google && window.google.maps && window.google.maps.places && inputRef.current) {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, { componentRestrictions: { country: 'pk' } });
      place = ac.getPlace();
    }
    if (place && place.geometry && place.geometry.location) {
      const coords = [
        place.geometry.location.lng(),
        place.geometry.location.lat()
      ];
      console.log("Place selected:", coords);
      setEnd(coords);
    }
  };

  return (
  <div className="w-full h-full relative">
    {/* Google Places Search bar */}
    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={['places']}
      >
        <Autocomplete
          onLoad={ac => (autocompleteRef.current = ac)}
          onPlaceChanged={handlePlaceChanged}
          options={{ componentRestrictions: { country: 'pk' } }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for destination..."
            className="w-full px-4 py-2 rounded shadow border border-gray-300 focus:outline-none focus:ring"
          />
        </Autocomplete>
      </LoadScript>
    </div>

    {/* Map Container */}
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ height: '500px' }}
    />

    {/* Loading Map Overlay */}
    {!mapLoaded && (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
        <div className="text-lg font-semibold">Loading map...</div>
      </div>
    )}

    {/* Loading Danger Zones Overlay */}
    {loading && (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
        <span>Loading danger zones...</span>
      </div>
    )}

    {/* Location Error Overlay */}
    {locationError && (
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-800 p-2 rounded shadow max-w-md text-center">
        {locationError}
      </div>
    )}

    {/* Legend */}
    <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow text-sm">
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
        <span>Your Location</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <span>Destination</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
        <span>Safe Route</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <span>Avoidance Route</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-[#bbff00] mr-2 border border-gray-400"></div>
        <span>Low Severity Danger Zone</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-[#ffff00] mr-2 border border-gray-400"></div>
        <span>Medium Severity Danger Zone</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-3 h-3 rounded-full bg-[#ff0000] mr-2 border border-gray-400"></div>
        <span>High Severity Danger Zone</span>
      </div>
    </div>
  </div>
)};