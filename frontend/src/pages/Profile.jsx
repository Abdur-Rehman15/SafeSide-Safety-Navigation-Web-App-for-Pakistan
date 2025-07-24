import { Box, Typography, Paper, Avatar, Divider, IconButton } from '@mui/material';
import { useAuth } from '../components/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import TransgenderIcon from '@mui/icons-material/Transgender';
import BadgeIcon from '@mui/icons-material/Badge';

export default function Profile() {
  const { user } = useAuth();

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 64px)',
      p: { xs: 2, sm: 3 },
      background: 'linear-gradient(135deg, #f9f9f9 0%, #f0f0f0 100%)'
    }}>
      <Paper sx={{
        width: '100%',
        maxWidth: 600,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        position: 'relative',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        {/* Header Section */}
        <Box sx={{
          height: 120,
          background: 'linear-gradient(135deg, #6A1B9A 0%, #9C27B0 100%)',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Avatar sx={{
            width: 120,
            height: 120,
            fontSize: 48,
            border: '4px solid white',
            bgcolor: '#FF6D00',
            position: 'absolute',
            bottom: -60,
            transform: 'translateX(-50%)',
            left: '50%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            '&:hover': {
              transform: 'translateX(-50%) scale(1.05)',
              transition: 'all 0.3s ease'
            }
          }}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Avatar>
        </Box>

        {/* Content Section */}
        <Box sx={{ pt: 8, pb: 4, px: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" sx={{
            textAlign: 'center',
            fontWeight: 700,
            color: '#333',
            mb: 1,
            fontSize: { xs: '1.8rem', sm: '2rem' }
          }}>
            {user?.firstName} {user?.lastName}
          </Typography>

          <Typography variant="body1" sx={{
            textAlign: 'center',
            color: '#666',
            mb: 4,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}>
            @{user?.username}
          </Typography>

          <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.08)' }} />

          {/* Profile Details */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 3
          }}>
            {/* Detail Item 1 */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(106, 27, 154, 0.05)',
              borderLeft: '4px solid #6A1B9A'
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(106, 27, 154, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <BadgeIcon sx={{ color: '#6A1B9A' }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                  Username
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.username}
                </Typography>
              </Box>
            </Box>

            {/* Detail Item 2 */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 109, 0, 0.05)',
              borderLeft: '4px solid #FF6D00'
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 109, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <EmailIcon sx={{ color: '#FF6D00' }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            {/* Detail Item 3 */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(106, 27, 154, 0.05)',
              borderLeft: '4px solid #6A1B9A'
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(106, 27, 154, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <PersonIcon sx={{ color: '#6A1B9A' }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
              </Box>
            </Box>

            {/* Detail Item 4 */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 109, 0, 0.05)',
              borderLeft: '4px solid #FF6D00'
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 109, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <TransgenderIcon sx={{ color: '#FF6D00' }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                  Gender
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.gender || 'Not specified'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}