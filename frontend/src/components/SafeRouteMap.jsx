// SafeRouteMap.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoiYWJkdXJyZWhtYW4xNSIsImEiOiJjbWN6MmQxcWQwc3MxMnFzMzZkYWtnYnUwIn0.FHAHKvVAO7ag-B95Dc-4Sw';

export default function SafeRouteMap({ start, end }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [error, setError] = useState(null);

  // Memoized route calculation function
  const calculateRealRoute = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?` +
        `geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`
      );

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      if (!data.routes?.length) throw new Error('No routes found');

      drawRoadRoute(data.routes[0]);
    } catch (err) {
      console.error('Navigation error:', err);
      setError(`Routing failed: ${err.message}`);
      drawStraightLineFallback();
    }
  }, [start, end]);

  // 1. Map initialization (runs once)
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: start,
      zoom: 13
    });

    // Add controls
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.ScaleControl());

    // Map load handler
    const handleLoad = () => {
      calculateRealRoute();
      addDebugMarkers();
    };

    map.current.on('load', handleLoad);

    // Cleanup
    return () => {
      if (map.current) {
        map.current.off('load', handleLoad);
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // 2. Route recalculation when start/end changes
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    if (mapInstance.loaded()) {
      calculateRealRoute();
    } else {
      mapInstance.once('load', calculateRealRoute);
    }

    // Safe cleanup
    return () => {
      if (mapInstance) {
        mapInstance.off('load', calculateRealRoute);
      }
    };
  }, [calculateRealRoute]);

  const drawRoadRoute = (routeData) => {
    if (!map.current?.loaded() || !routeData?.geometry) return;

    // Clear existing route
    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
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
      id: 'route-line',
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

    // Fit bounds
    const bounds = routeData.geometry.coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds()
    );
    map.current.fitBounds(bounds, { padding: 50 });
  };

  const drawStraightLineFallback = () => {
    if (!map.current?.loaded()) return;

    if (map.current.getSource('fallback-route')) {
      map.current.removeLayer('fallback-line');
      map.current.removeSource('fallback-route');
    }

    map.current.addSource('fallback-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [start, end]
        }
      }
    });

    map.current.addLayer({
      id: 'fallback-line',
      type: 'line',
      source: 'fallback-route',
      paint: {
        'line-color': '#ff0000',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });
  };

  const addDebugMarkers = () => {
    // Clear existing markers
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(marker => marker.remove());

    new mapboxgl.Marker({ color: '#00FF00' })
      .setLngLat(start)
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#FF0000' })
      .setLngLat(end)
      .addTo(map.current);
  };

  return (
    <div className="relative w-full" style={{ height: '500px' }}>
      <div
        ref={mapContainer}
        className="absolute top-0 left-0 w-full h-full"
      />
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 text-red-800 p-3 rounded shadow">
          {error}
        </div>
      )}
    </div>
  );
}