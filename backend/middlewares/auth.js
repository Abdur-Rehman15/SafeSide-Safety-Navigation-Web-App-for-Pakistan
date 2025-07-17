import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  
  // 1. Get token from header - more robust parsing
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // Trim any whitespace and split
    const parts = authHeader.trim().split(' ');
    
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'No token provided or malformed authorization header'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const currentUser = await User.findOne({ userId: decoded.userId });
    
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'User no longer exists'
      });
    }

    req.user = {
      _id: currentUser._id,
      userId: currentUser.userId,
      email: currentUser.email
    };
    
    next();
  } catch (err) {
    console.error('Token verification error:', err); 
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token'
    });
  }
};