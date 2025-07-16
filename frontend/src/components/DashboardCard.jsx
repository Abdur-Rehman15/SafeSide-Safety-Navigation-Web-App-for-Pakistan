import { Card, CardContent, Typography, Button, Box } from '@mui/material';

export default function DashboardCard({ title, description, icon, onClick }) {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.3s',
        '&:hover': {
          transform: 'scale(1.03)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box textAlign="center" fontSize="3rem" mb={2}>
          {icon}
        </Box>
        <Typography gutterBottom variant="h5" component="h2" textAlign="center">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {description}
        </Typography>
      </CardContent>
      <Box sx={{ p: 2 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={onClick}
          sx={{ backgroundColor: '#1976d2' }}
        >
          Open
        </Button>
      </Box>
    </Card>
  );
}