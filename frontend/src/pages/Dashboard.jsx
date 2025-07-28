import { Grid } from '@mui/material';
import DashboardCard from '../components/DashboardCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Location Review',
      description: 'Check safety ratings for specific location',
      icon: '📍',
      onClick: () => navigate('/location-review')
    },
    {
      title: 'Find Safest Route',
      description: 'Get directions avoiding high-risk areas',
      icon: '🗺️',
      onClick: () => navigate('/safe-route')
    },
    {
      title: 'Report Crime',
      description: 'Submit reports of unsafe incidents',
      icon: '🚨',
      onClick: () => navigate('/report-crime')
    }
  ];

  return (
    <Grid container spacing={3} sx={{ p: 3, justifyContent: 'center', alignItems: 'center' }}>
      {features.map((feature, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <DashboardCard {...feature} />
        </Grid>
      ))}
    </Grid>
  );
}