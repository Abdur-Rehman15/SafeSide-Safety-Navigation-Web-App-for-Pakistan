// backend/routes/routes.js
import axios from 'axios';
import express from 'express';

const router = express.Router();

router.post('/calculate', async (req, res) => {
  try {
    const { start, end } = req.body;
    
    // Validate coordinates
    if (!Array.isArray(start) || start.length !== 2 || 
        !Array.isArray(end) || end.length !== 2) {
      return res.status(400).json({ error: 'Invalid coordinates format' });
    }

    // Call Mapbox Directions API
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}`, {
        params: {
          geometries: 'geojson',
          steps: true,
          access_token: process.env.MAPBOX_ACCESS_TOKEN
        }
      }
    );

    // Return the first (best) route
    res.json({
      status: 'success',
      data: {
        route: response.data.routes[0],
        waypoints: response.data.waypoints
      }
    });

  } catch (error) {
    console.error('Routing error:', error.response?.data || error.message);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to calculate route',
      details: error.response?.data?.message || error.message
    });
  }
});

export default router;