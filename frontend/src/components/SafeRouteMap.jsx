// LiveRouteMap.jsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function LiveRouteMap({ end }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const userMarker = useRef(null);
  const destinationMarker = useRef(null);
  const positionWatchId = useRef(null);

  // Initialize map and markers
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    console.log("Initializing map...");
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0], // Default center
      zoom: 15 // More reasonable zoom level
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

    // Start position tracking when map loads
    map.current.on('load', () => {
      console.log("Map loaded successfully");
      setMapLoaded(true);
      startPositionTracking();
    });

    map.current.on('error', (e) => {
      console.error("Map error:", e);
    });

    return () => {
      console.log("Cleaning up map and geolocation...");
      if (positionWatchId.current) {
        navigator.geolocation.clearWatch(positionWatchId.current);
        positionWatchId.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const startPositionTracking = () => {
    if (!navigator.geolocation) {
      const error = "Geolocation is not supported by this browser";
      console.error(error);
      setLocationError(error);
      return;
    }

    console.log("Starting position tracking...");
    
    // First get current position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Got initial position:", position.coords);
        handleNewPosition(position);
      },
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

    // Then watch for updates
    positionWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        console.log("Position update:", position.coords);
        handleNewPosition(position);
      },
      (error) => {
        console.error("Geolocation watch error:", error);
        setLocationError(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,  // Accept positions up to 5 seconds old
        timeout: 15000
      }
    );
  };

  const getLocationErrorMessage = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        return "Location access denied by user";
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable";
      case error.TIMEOUT:
        return "Location request timed out";
      default:
        return "An unknown error occurred";
    }
  };

  const handleNewPosition = (position) => {
    const newPosition = [
      position.coords.longitude,
      position.coords.latitude
    ];
    
    console.log("Updating position to:", newPosition);
    setCurrentPosition(newPosition);
    setLocationError(null); // Clear any previous errors
    
    // Update user marker
    if (userMarker.current && map.current) {
      userMarker.current
        .setLngLat(newPosition)
        .addTo(map.current);
      
      console.log("User marker updated");
    }

    // Center map on user position (only on first position or if explicitly needed)
    if (map.current && map.current.loaded()) {
      map.current.flyTo({
        center: newPosition,
        zoom: 16,
        essential: true
      });
      console.log("Map centered on user position");
    }

    // Update route if we have destination
    if (end && Array.isArray(end) && end.length === 2) {
      updateRoute(newPosition, end);
    }
  };

  const updateRoute = async (startPos, endPos) => {
    if (!map.current?.loaded()) return;
    
    console.log("Updating route from", startPos, "to", endPos);
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startPos[0]},${startPos[1]};${endPos[0]},${endPos[1]}?` +
        `geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Route data received:", data);
      
      if (data.routes?.length) {
        drawRoute(data.routes[0]);
      } else {
        console.warn("No routes found in response");
      }
    } catch (error) {
      console.error("Error updating route:", error);
    }
  };

  const drawRoute = (routeData) => {
    if (!map.current?.loaded() || !routeData) {
      console.warn("Cannot draw route: map not loaded or no route data");
      return;
    }

    console.log("Drawing route...");

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
        'line-color': '#3a86ff',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
    
    console.log("Route drawn successfully");
  };

  const updateDestinationMarker = (position) => {
    if (!map.current?.loaded() || !destinationMarker.current) {
      console.warn("Cannot update destination marker: map not loaded");
      return;
    }
    
    console.log("Updating destination marker to:", position);
    
    destinationMarker.current
      .setLngLat(position)
      .setPopup(new mapboxgl.Popup().setHTML("<b>Destination</b>"))
      .addTo(map.current);
  };

  // Update destination when prop changes
  useEffect(() => {
    if (end && Array.isArray(end) && end.length === 2) {
      console.log("Destination prop changed to:", end);
      updateDestinationMarker(end);
      if (currentPosition) {
        updateRoute(currentPosition, end);
      }
    }
  }, [end, currentPosition]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ height: '500px' }}
      />
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs max-w-xs">
          <div>Map Loaded: {mapLoaded ? 'Yes' : 'No'}</div>
          <div>Current Position: {currentPosition ? `${currentPosition[1].toFixed(6)}, ${currentPosition[0].toFixed(6)}` : 'None'}</div>
          <div>Destination: {end ? `${end[1]}, ${end[0]}` : 'None'}</div>
          {locationError && <div className="text-red-500">Error: {locationError}</div>}
        </div>
      )}
    </div>
  );
}