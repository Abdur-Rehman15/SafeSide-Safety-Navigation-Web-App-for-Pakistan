import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile'
import CrimeReportForm from './components/CrimeReportForm';
import LocationReview from './components/LocationReview';
import SafeRouteMap from './components/SafeRouteMap'

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/home",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
        ],
      },
      {
        path: "/profile",
        element: <Profile/>
      },
      {
        path: "/report-crime",
        element: <CrimeReportForm/>
      },
      {
        path: "/location-review",
        element: <LocationReview/>
      },
    ],
  },
  {
    path: "/safe-route",
    element: <SafeRouteMap/>
  }
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;