// App.jsx
import LiveRouteMap from './components/SafeRouteMap';

function App() {
  // Destination coordinates (Lahore Fort)

  const destination = [74.240000, 31.392714];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Live Navigation</h1>
      <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <LiveRouteMap end={destination} />
      </div>
    </div>
  );
}

export default App;