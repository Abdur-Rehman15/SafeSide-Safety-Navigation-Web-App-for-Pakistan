import { Card, CardContent, Typography, Button, Box, styled } from '@mui/material';

const SafetyCard = styled(Card)(({ theme }) => ({
  width: 280, // Fixed width instead of 100%
  height: 320, // Fixed height
  margin: '0 auto', // Center horizontally
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid rgba(0,0,0,0.05)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 28px rgba(106,27,154,0.15)',
    '&::before': {
      opacity: 0.2
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    background: 'linear-gradient(90deg, #6A1B9A 0%, #FF6D00 100%)',
    opacity: 0.1,
    transition: 'opacity 0.3s ease'
  }
}));

const CardIconWrapper = styled(Box)(({ theme }) => ({
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'rgba(106, 27, 154, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  color: '#6A1B9A',
  fontSize: '2.5rem',
  '& svg': {
    fontSize: '2.5rem'
  }
}));

const SafetyButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #6A1B9A 0%, #9C27B0 100%)',
  color: 'white',
  borderRadius: '12px',
  padding: '10px 24px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    background: 'linear-gradient(135deg, #5A1B8A 0%, #8C27A0 100%)',
    boxShadow: '0 4px 12px rgba(106,27,154,0.3)'
  }
}));

export default function DashboardCard({ title, description, icon, onClick }) {
  return (
    <SafetyCard>
      <CardContent sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 3,
        textAlign: 'center'
      }}>
        <CardIconWrapper>
          {icon}
        </CardIconWrapper>
        
        <Typography 
          variant="h6" 
          component="h3" 
          sx={{
            textAlign: 'center',
            fontWeight: 700,
            color: '#333',
            mb: 1.5,
            fontSize: '1.25rem',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{
            color: '#666',
            mb: 3,
            fontSize: '0.875rem',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexGrow: 1
          }}
        >
          {description}
        </Typography>
        
        <Box sx={{ 
          mt: 'auto',
          px: 1,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <SafetyButton 
            fullWidth 
            onClick={onClick}
            size="medium"
          >
            Next
          </SafetyButton>
        </Box>
      </CardContent>
    </SafetyCard>
  );
}