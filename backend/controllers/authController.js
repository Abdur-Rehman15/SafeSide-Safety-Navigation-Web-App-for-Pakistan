import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../utils/sendWelcomeEmail.js';

// User registration
export const register = async (req, res) => {
  try {
    const { username, firstName, lastName, gender, email, password, emergencyNumber } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      firstName,
      lastName,
      gender,
      email,
      password: hashedPassword,
      emergencyNumber
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user.userId, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    sendWelcomeEmail(user.email, user.firstName)
    .then(() => console.log('Welcome email sent!'))
    .catch(err => console.error('Failed to send welcome email:', err));

    res.status(201).json({ 
      userId: user.userId,
      username: user.username,
      token 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user.userId, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ 
      userId: user.userId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      email: user.email,
      userId: user.userId,
      token,
      emergencyNumber: user.emergencyNumber 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
// Example controller using req.user._id
export const getProfile = async (req, res) => {
  try {
    // Add this debug line:
    console.log('User in request:', req.user);
    
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};