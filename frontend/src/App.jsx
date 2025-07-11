import { useState } from 'react';
import SafeRouteMap from './components/SafeRouteMap';

function App() {
  const [start] = useState([74.3587, 31.5204]); // Lahore coordinates
  const [end] = useState([74.3687, 31.5304]); // Nearby point

  return (
    <div className="app p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Safety Routing App</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div style={{ width: '100%', height: '600px' }}>
          <SafeRouteMap start={start} end={end} />
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-gray-50 rounded">
      </div>
    </div>
  );
}

export default App;