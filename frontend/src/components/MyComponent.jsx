import { useRef } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const MyComponent = ({ onPlaceSelected }) => {
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place && place.geometry) {
      const coords = [
        place.geometry.location.lng(),
        place.geometry.location.lat()
      ];
      // Pass these coordinates to your Mapbox logic
      if (onPlaceSelected) onPlaceSelected(coords, place);
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <Autocomplete
        onLoad={ref => (autocompleteRef.current = ref)}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: 'pk' }
        }}
      >
        <input
          type="text"
          placeholder="Search for any place in Pakistan..."
          className="w-full px-4 py-2 rounded shadow border border-gray-300 focus:outline-none focus:ring"
        />
      </Autocomplete>
    </LoadScript>
  );
};

export default MyComponent;