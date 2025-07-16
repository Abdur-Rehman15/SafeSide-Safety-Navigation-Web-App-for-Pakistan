import { Box, Typography, Paper, Avatar, List, ListItem, ListItemText } from '@mui/material';
import { useAuth } from '../components/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ width: 100, height: 100, fontSize: 40, mb: 2 }}>
          {user?.firstName?.charAt(0)}
        </Avatar>
        <Typography variant="h4">{user?.firstName} {user?.lastName}</Typography>
      </Box>
      <List sx={{ mt: 3 }}>
        <ListItem>
          <ListItemText primary="Username" secondary={user?.username} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Email" secondary={user?.email} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Gender" secondary={user?.gender} />
        </ListItem>
      </List>
    </Paper>
  );
}