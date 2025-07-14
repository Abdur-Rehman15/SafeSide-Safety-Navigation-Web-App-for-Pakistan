// LiveRouteMap.jsx
import { useEffect, useRef, useState } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LiveRouteMap({ end: propEnd }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dangerZonesDrawn, setDangerZonesDrawn] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);
  // Google Places Autocomplete state
  const autocompleteRef = useRef();
  const inputRef = useRef();
  const [end, setEnd] = useState(propEnd || null);
  const userMarker = useRef(null);
  const destinationMarker = useRef(null);
  const positionWatchId = useRef(null);

  // Centralized danger zones configuration
  const DANGER_ZONES = [
    {
      id: 'zone-1',
      lat: 31.390014,
      lng: 74.260000,
      radius: 500 // meters
    },
    {
      id: 'zone-2', 
      lat: 31.390900,
      lng: 74.238000,
      radius: 400 // meters
    }
  ];

  // Initialize map and markers
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    console.log("Initializing map...");
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [74.255, 31.39], // Center around your danger zones
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
      
      // Use setTimeout to ensure map is fully ready
      setTimeout(() => {
        drawAllDangerZones();
        startPositionTracking();
      }, 100);
    });

    // Error handling
    map.current.on('error', (e) => {
      console.error("Map error:", e);
      setLocationError("Failed to load map. Please refresh the page.");
    });

    // Cleanup
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

  // Handle position updates and route calculation
  useEffect(() => {
    if (!mapLoaded || !currentPosition || !end) return;

    const updateMap = async () => {
      try {
        await updateDestinationMarker(end);
        await updateRouteWithAvoidance(currentPosition, end);
        
        console.log('Current position:', currentPosition);
        console.log('Destination:', end);
        
        // Ensure danger zones are always visible
        if (!dangerZonesDrawn) {
          drawAllDangerZones();
        }
        
        if (isInitialRender) {
          setIsInitialRender(false);
        }
      } catch (error) {
        console.error("Error updating map:", error);
      }
    };

    updateMap();
  }, [mapLoaded, currentPosition, end, isInitialRender, dangerZonesDrawn]);

  // Update end if propEnd changes
  useEffect(() => {
    if (propEnd) setEnd(propEnd);
  }, [propEnd]);


  // Google Places Autocomplete handler
  const handlePlaceChanged = () => {
    let place = null;
    if (autocompleteRef.current && typeof autocompleteRef.current.getPlace === 'function') {
      place = autocompleteRef.current.getPlace();
    } else if (window.google && window.google.maps && window.google.maps.places && inputRef.current) {
      // fallback: get Autocomplete instance from input
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, { componentRestrictions: { country: 'pk' } });
      place = ac.getPlace();
    }
    if (place && place.geometry && place.geometry.location) {
      const coords = [
        place.geometry.location.lng(),
        place.geometry.location.lat()
      ];
      console.log('Selected coords:', coords, 'Place:', place);
      setEnd(coords);
    } else {
      console.warn('No geometry found for selected place:', place);
    }
  };

  const startPositionTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    console.log("Starting position tracking...");
    
    // Get current position immediately
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

    // Watch for position updates
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
    
    console.log('New position coordinates:', newPosition);
    setCurrentPosition(newPosition);
    setLocationError(null);

    // Update user marker if map is loaded
    if (map.current && userMarker.current) {
      userMarker.current
        .setLngLat(newPosition)
        .addTo(map.current);
      
      // Only center on first position to avoid constant recentering
      if (isInitialRender) {
        map.current.flyTo({
          center: newPosition,
          zoom: 16,
          essential: true
        });
        console.log("Map centered on user position");
      }
    }
  };

  const updateDestinationMarker = async (position) => {
    if (!mapLoaded || !destinationMarker.current) {
      throw new Error("Map not loaded or destination marker not initialized");
    }
    
    destinationMarker.current
      .setLngLat(position)
      .setPopup(new mapboxgl.Popup().setHTML("<b>Destination</b>"))
      .addTo(map.current);
  };

  // Enhanced route calculation with proper danger zone avoidance
  const updateRouteWithAvoidance = async (startPos, endPos) => {
    if (!mapLoaded) {
      throw new Error("Map not loaded");
    }

    try {
      console.log("=== ROUTE CALCULATION START ===");
      console.log("Start position:", startPos);
      console.log("End position:", endPos);
      
      // Step 1: Get direct route for analysis
      const directRoute = await getDirectRoute(startPos, endPos);
      console.log("Direct route obtained, distance:", directRoute.distance, "meters");
      
      // Step 2: Check if direct route intersects any danger zones
      // Special logic: allow entering a danger zone if the destination is inside it
      // 1. Find zones containing the destination
      const destinationZones = DANGER_ZONES.filter(zone => {
        return haversineDistance([zone.lng, zone.lat], endPos) <= zone.radius;
      });
      // 2. Exclude these from avoidance
      const zonesToAvoid = DANGER_ZONES.filter(zone => !destinationZones.includes(zone));

      // 3. Check if direct route intersects any zones to avoid
      const intersectingZones = checkRouteIntersection(directRoute, zonesToAvoid);
      console.log(`Found ${intersectingZones.length} intersecting zones (excluding destination zones):`, intersectingZones.map(z => z.id));

      if (intersectingZones.length === 0) {
        // No intersection, use direct route
        console.log("✅ No intersection detected, using direct route");
        drawRoute(directRoute, destinationZones.length > 0 ? '#ff6600' : '#3a86ff'); // Orange if destination is in danger zone
        return;
      }

      console.log("⚠️ Intersection detected, searching for robust avoidance route...");

      // Generate systematic waypoints around all intersecting zones
      const allZoneWaypoints = intersectingZones.map(zone => generateSystematicWaypoints(startPos, endPos, zone));

      // Flatten to get all possible single-waypoint detours
      const singleWaypoints = allZoneWaypoints.flat();

      // Try all single-waypoint detours
      for (const wpArr of singleWaypoints) {
        try {
          const route = await getRouteWithWaypoints(startPos, endPos, wpArr);
          if (route && checkRouteIntersection(route, zonesToAvoid).length === 0) {
            console.log("✅ Found avoidance route with 1 waypoint");
            drawRoute(route, destinationZones.length > 0 ? '#ff6600' : '#00ff00');
            return;
          }
        } catch (e) { continue; }
      }

      // Try all pairs of waypoints (up to 2 waypoints, for efficiency)
      const allPairs = [];
      for (let i = 0; i < singleWaypoints.length; i++) {
        for (let j = i + 1; j < singleWaypoints.length; j++) {
          allPairs.push([...singleWaypoints[i], ...singleWaypoints[j]]);
        }
      }
      for (const wpArr of allPairs) {
        try {
          const route = await getRouteWithWaypoints(startPos, endPos, wpArr);
          if (route && checkRouteIntersection(route, zonesToAvoid).length === 0) {
            console.log("✅ Found avoidance route with 2 waypoints");
            drawRoute(route, destinationZones.length > 0 ? '#ff6600' : '#00ff00');
            return;
          }
        } catch (e) { continue; }
      }

      // If still not found, try 3-waypoint detours (optional, can be slow)
      const allTriplets = [];
      for (let i = 0; i < singleWaypoints.length; i++) {
        for (let j = i + 1; j < singleWaypoints.length; j++) {
          for (let k = j + 1; k < singleWaypoints.length; k++) {
            allTriplets.push([...singleWaypoints[i], ...singleWaypoints[j], ...singleWaypoints[k]]);
          }
        }
      }
      for (const wpArr of allTriplets) {
        try {
          const route = await getRouteWithWaypoints(startPos, endPos, wpArr);
          if (route && checkRouteIntersection(route, zonesToAvoid).length === 0) {
            console.log("✅ Found avoidance route with 3 waypoints");
            drawRoute(route, destinationZones.length > 0 ? '#ff6600' : '#00ff00');
            return;
          }
        } catch (e) { continue; }
      }

      // If no avoidance route found, show error and do not draw a route
      setLocationError("No safe route found that avoids all danger zones (except destination zone). Try a different destination.");
      if (map.current && map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }
      console.log("❌ No avoidance route found. No route drawn.");
      return;
    } catch (error) {
      console.error("Error in route calculation:", error);
      throw error;
    }
  };

  // Get direct route for analysis
  const getDirectRoute = async (startPos, endPos) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${startPos[0]},${startPos[1]};${endPos[0]},${endPos[1]}?` +
      `geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }
    return data.routes[0];
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

      console.log(`Checking zone ${zone.id}:`, {
        center: zoneCenter,
        radiusMeters: radiusInMeters
      });

      // Check each segment of the route
      let intersectionFound = false;
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];

        if (lineIntersectsCircle(start, end, zoneCenter, radiusInMeters)) {
          console.log(`Intersection found at segment ${i}:`, start, 'to', end);
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

  // Simple avoidance strategy - offset the entire route
  const trySimpleAvoidance = async (startPos, endPos, intersectingZones) => {
    console.log("Trying simple avoidance...");
    
    const mainZone = intersectingZones[0];
    const zoneCenter = [mainZone.lng, mainZone.lat];
    const safeDistance = mainZone.radius * 2;
    
    // Calculate midpoint between start and end
    const midPoint = [
      (startPos[0] + endPos[0]) / 2,
      (startPos[1] + endPos[1]) / 2
    ];
    
    // Calculate bearing from zone center to midpoint
    const bearing = calculateBearing(zoneCenter, midPoint);
    
    // Create waypoint on the opposite side of the zone
    const avoidanceBearing = bearing + 180; // Opposite direction
    const waypoint = calculateDestination(zoneCenter, avoidanceBearing, safeDistance);
    
    console.log("Simple avoidance waypoint:", waypoint);
    
    try {
      const route = await getRouteWithWaypoints(startPos, endPos, [waypoint]);
      return route;
    } catch (error) {
      console.log("Simple avoidance failed:", error.message);
      return null;
    }
  };

  // Calculate robust avoidance route using multiple strategies
  const calculateRobustAvoidanceRoute = async (startPos, endPos, intersectingZones) => {
    const strategies = [
      // Strategy 1: Systematic waypoint generation
      () => tryWaypointStrategy(startPos, endPos, intersectingZones),
      
      // Strategy 2: Perpendicular avoidance
      () => tryPerpendicularStrategy(startPos, endPos, intersectingZones),
      
      // Strategy 3: Wide arc avoidance
      () => tryWideArcStrategy(startPos, endPos, intersectingZones),
      
      // Strategy 4: Multiple intermediate points
      () => tryMultiPointStrategy(startPos, endPos, intersectingZones)
    ];

    for (const strategy of strategies) {
      try {
        const route = await strategy();
        if (route && checkRouteIntersection(route, intersectingZones).length === 0) {
          console.log("Avoidance strategy successful");
          return route;
        }
      } catch (error) {
        console.warn("Avoidance strategy failed:", error);
      }
    }

    return null;
  };

  // Strategy 1: Try systematic waypoint generation
  const tryWaypointStrategy = async (startPos, endPos, intersectingZones) => {
    console.log("Trying waypoint strategy...");
    
    for (const zone of intersectingZones) {
      console.log(`Generating waypoints for zone ${zone.id}`);
      const zoneCenter = [zone.lng, zone.lat];
      const safeDistance = zone.radius * 2.5; // Increased safety margin
      
      // Try waypoints in 8 directions around the zone
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      
      for (const angle of angles) {
        try {
          const waypoint = calculateDestination(zoneCenter, angle, safeDistance);
          console.log(`Trying waypoint at ${angle}°:`, waypoint);
          
          const route = await getRouteWithWaypoints(startPos, endPos, [waypoint]);
          if (route) {
            console.log("Waypoint strategy successful!");
            return route;
          }
        } catch (error) {
          console.log(`Waypoint at ${angle}° failed:`, error.message);
          continue;
        }
      }
    }
    return null;
  };

  // Strategy 2: Perpendicular avoidance
  const tryPerpendicularStrategy = async (startPos, endPos, intersectingZones) => {
    console.log("Trying perpendicular avoidance strategy...");
    
    const mainZone = intersectingZones[0];
    const zoneCenter = [mainZone.lng, mainZone.lat];
    const safeDistance = mainZone.radius * 3; // Triple the radius for extra safety
    
    // Calculate bearing from start to end
    const bearing = calculateBearing(startPos, endPos);
    console.log(`Main bearing: ${bearing}°`);
    
    // Generate multiple waypoints around the zone
    const angles = [bearing + 90, bearing - 90, bearing + 45, bearing - 45, bearing + 135, bearing - 135];
    
    for (const angle of angles) {
      try {
        const waypoint = calculateDestination(zoneCenter, angle, safeDistance);
        console.log(`Trying waypoint at angle ${angle}°:`, waypoint);
        
        const route = await getRouteWithWaypoints(startPos, endPos, [waypoint]);
        if (route) {
          console.log("Perpendicular strategy successful!");
          return route;
        }
      } catch (error) {
        console.log(`Waypoint at angle ${angle}° failed:`, error.message);
        continue;
      }
    }
    return null;
  };

  // Strategy 3: Wide arc avoidance
  const tryWideArcStrategy = async (startPos, endPos, intersectingZones) => {
    console.log("Trying wide arc strategy...");
    
    const mainZone = intersectingZones[0];
    const zoneCenter = [mainZone.lng, mainZone.lat];
    const safeDistance = mainZone.radius * 4; // Quadruple the radius for wide arc
    
    // Calculate the perpendicular direction to the start-end line
    const bearing = calculateBearing(startPos, endPos);
    const perpendicular1 = bearing + 90;
    const perpendicular2 = bearing - 90;
    
    // Try both sides of the perpendicular
    for (const perpBearing of [perpendicular1, perpendicular2]) {
      try {
        // Create multiple waypoints for a smooth arc
        const waypoints = [];
        const numWaypoints = 2;
        
        for (let i = 1; i <= numWaypoints; i++) {
          const distance = safeDistance * (0.5 + i * 0.5); // Varying distances
          const waypoint = calculateDestination(zoneCenter, perpBearing, distance);
          waypoints.push(waypoint);
        }
        
        console.log(`Trying arc with ${waypoints.length} waypoints:`, waypoints);
        
        const route = await getRouteWithWaypoints(startPos, endPos, waypoints);
        if (route) {
          console.log("Wide arc strategy successful!");
          return route;
        }
      } catch (error) {
        console.log(`Arc at bearing ${perpBearing}° failed:`, error.message);
        continue;
      }
    }
    return null;
  };

  // Strategy 4: Multiple intermediate points
  const tryMultiPointStrategy = async (startPos, endPos, intersectingZones) => {
    const midPoint = [
      (startPos[0] + endPos[0]) / 2,
      (startPos[1] + endPos[1]) / 2
    ];
    
    // Find the furthest zone from the midpoint
    let maxDistance = 0;
    let furthestZone = intersectingZones[0];
    
    for (const zone of intersectingZones) {
      const distance = haversineDistance(midPoint, [zone.lng, zone.lat]);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthestZone = zone;
      }
    }
    
    // Create waypoints that go around the furthest zone
    const zoneCenter = [furthestZone.lng, furthestZone.lat];
    const safeDistance = furthestZone.radius * 2.5;
    
    const bearing1 = calculateBearing(startPos, zoneCenter) + 90;
    const bearing2 = calculateBearing(zoneCenter, endPos) - 90;
    
    const waypoint1 = calculateDestination(zoneCenter, bearing1, safeDistance);
    const waypoint2 = calculateDestination(zoneCenter, bearing2, safeDistance);
    
    try {
      return await getRouteWithWaypoints(startPos, endPos, [waypoint1, waypoint2]);
    } catch (error) {
      return null;
    }
  };

  // Generate systematic waypoints around a danger zone (returns array of arrays for combinatorics)
  const generateSystematicWaypoints = (startPos, endPos, zone) => {
    const zoneCenter = [zone.lng, zone.lat];
    const safeDistance = zone.radius * 2.2; // Slightly more than double radius
    const waypoints = [];
    // Generate waypoints at 8 angles around the zone
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    angles.forEach(angle => {
      const waypoint = calculateDestination(zoneCenter, angle, safeDistance);
      waypoints.push([waypoint]); // Each as array for combinatorics
    });
    return waypoints;
  };

  // Calculate bearing between two points (fixed formula)
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

  // Calculate destination point given start point, bearing, and distance
  const calculateDestination = (start, bearing, distance) => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = start[1] * Math.PI / 180;
    const lng1 = start[0] * Math.PI / 180;
    const bearingRad = bearing * Math.PI / 180;
    
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) +
                          Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad));
    
    const lng2 = lng1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
                                  Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));
    
    return [lng2 * 180 / Math.PI, lat2 * 180 / Math.PI];
  };

  // Get route with waypoints (enhanced with better error handling)
  const getRouteWithWaypoints = async (startPos, endPos, waypoints) => {
    const waypointString = waypoints.map(wp => `;${wp[0]},${wp[1]}`).join('');
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startPos[0]},${startPos[1]}${waypointString};${endPos[0]},${endPos[1]}?` +
      `geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;
    
    console.log("Requesting route with waypoints:", url);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Route request failed:", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Route response:", data);
    
    if (!data.routes || data.routes.length === 0) {
      console.error("No routes found in response");
      throw new Error("No route found with waypoints");
    }
    
    const route = data.routes[0];
    console.log("Route found - distance:", route.distance, "duration:", route.duration);
    
    return route;
  };

  // Draw all danger zones on the map
  const drawAllDangerZones = () => {
    if (!mapLoaded || !map.current) {
      console.warn("Cannot draw danger zones: map not loaded");
      return;
    }

    console.log("Drawing all danger zones...");
    
    try {
      DANGER_ZONES.forEach((zone) => {
        drawSingleDangerZone(zone);
      });
      setDangerZonesDrawn(true);
      console.log("All danger zones drawn successfully");
    } catch (error) {
      console.error("Error drawing danger zones:", error);
    }
  };

  // Draw a single danger zone
  const drawSingleDangerZone = (zone) => {
    const sourceId = `danger-zone-${zone.id}`;
    const fillId = `danger-zone-fill-${zone.id}`;
    const outlineId = `danger-zone-outline-${zone.id}`;

    try {
      // Remove existing layers if they exist
      if (map.current.getLayer(fillId)) {
        map.current.removeLayer(fillId);
      }
      if (map.current.getLayer(outlineId)) {
        map.current.removeLayer(outlineId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Create circle polygon using proper geographic calculations
      const points = [];
      const numPoints = 64; // More points for smoother circle
      const radiusInMeters = zone.radius;
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const point = calculateDestination([zone.lng, zone.lat], angle * 180 / Math.PI, radiusInMeters);
        points.push(point);
      }
      points.push(points[0]); // Close the polygon

      const dangerZonePolygon = {
        type: "Polygon",
        coordinates: [points]
      };

      // Add source and layers
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: dangerZonePolygon,
          properties: { 
            id: zone.id,
            radius: zone.radius 
          }
        }
      });

      map.current.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.4
        }
      });

      map.current.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#cc0000',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });

      console.log(`Danger zone ${zone.id} drawn successfully`);
    } catch (error) {
      console.error(`Error drawing danger zone ${zone.id}:`, error);
    }
  };

  // Draw route on the map with color coding
  const drawRoute = (routeData, color = '#3a86ff') => {
    if (!mapLoaded || !routeData) return;

    try {
      // Remove existing route
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add new route
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeData.geometry
        }
      });

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
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      console.log(`Route drawn successfully with color: ${color}`);
    } catch (error) {
      console.error("Error drawing route:", error);
    }
  };

  const getLocationErrorMessage = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED: return "Location access denied by user";
      case error.POSITION_UNAVAILABLE: return "Location information unavailable";
      case error.TIMEOUT: return "Location request timed out";
      default: return "An unknown error occurred";
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
              placeholder="Search for any place in Pakistan..."
              className="w-full px-4 py-2 rounded shadow border border-gray-300 focus:outline-none focus:ring"
            />
          </Autocomplete>
        </LoadScript>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ height: '500px' }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="text-lg font-semibold">Loading map...</div>
        </div>
      )}

      {/* Enhanced debug panel */}
      <div className="absolute top-2 left-2 bg-white p-3 rounded shadow text-xs max-w-sm z-10">
        <div className="font-bold mb-1">Debug Info:</div>
        <div>Map Status: {mapLoaded ? '✅ Loaded' : '⏳ Loading'}</div>
        <div>Danger Zones: {dangerZonesDrawn ? '✅ Drawn' : '⏳ Drawing'} ({DANGER_ZONES.length} total)</div>
        <div>Current Position: {currentPosition ? `${currentPosition[1].toFixed(6)}, ${currentPosition[0].toFixed(6)}` : '⏳ Acquiring...'}</div>
        <div>Destination: {end ? `${end[1].toFixed(6)}, ${end[0].toFixed(6)}` : 'None'}</div>
        {locationError && (
          <div className="text-red-500 mt-1">❌ Error: {locationError}</div>
        )}
        <div className="mt-2 text-xs text-gray-600">
          <div>🔵 Blue Route: Safe path</div>
          <div>🟢 Green Route: Avoidance path</div>
          <div>🟠 Orange Route: Dangerous path</div>
          <div>🔴 Red Zones: Danger areas</div>
        </div>
      </div>

      {/* Manual danger zone refresh button */}
      <button
        onClick={drawAllDangerZones}
        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded shadow text-xs hover:bg-red-600"
      >
        Refresh Danger Zones
      </button>
    </div>
  );
}