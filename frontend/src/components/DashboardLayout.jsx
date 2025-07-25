import { Outlet, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Avatar, Menu, MenuItem, IconButton } from '@mui/material';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); 
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className="dashboard">
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SafeSide Pakistan
          </Typography>
          <div>
            <IconButton onClick={handleMenuOpen}>
              <Avatar sx={{ bgcolor: 'white', color: '#1976d2' }}>
                {user?.firstName?.charAt(0)}
              </Avatar>
              <Typography variant="subtitle1" sx={{ ml: 1, color: 'white' }}>
                {user?.firstName}
              </Typography>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem component={Link} to="/profile">Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Outlet />
    </div>
  );
}