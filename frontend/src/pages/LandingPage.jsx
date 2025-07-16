import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { Button } from '@mui/material';
import { useContext } from 'react';
import { AuthProvider } from '../components/AuthContext';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

const LandingPage = () => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  // Safely get setActiveModal from AuthContext, fallback to no-op if undefined
  const authContext = useContext(AuthProvider) || {};
  const setActiveModal = authContext.setActiveModal || (() => {});

  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <motion.h1 
            className="app-name"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            SafeRoute<span>Pakistan</span>
          </motion.h1>
        </div>
        <div className="navbar-right">
          <Button 
            variant="outlined" 
            onClick={() => setActiveModal('login')}
            sx={{ mr: 2 }}
          >
            Login
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setActiveModal('signup')}
          >
            Sign Up
          </Button>

          {/* These modals will appear when buttons are clicked */}
          <LoginModal />
          <SignupModal />
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h1>Navigate <span>Safe</span>, Travel <span>Smart</span></h1>
          <p>Real-time danger zone alerts for safer routes in Pakistan.</p>
          <motion.button
            className="cta-button"
            whileHover={{ scale: 1.05, backgroundColor: "#0056b3" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup')}
          >
            Get Started for Free
          </motion.button>
        </motion.div>
        <motion.div
          className="hero-image"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <img src="/safety-map.png" alt="Safety Navigation" />
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="features-section">
        <h2>Why Choose <span>SafeRoute</span>?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              whileHover={{ y: -10, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

// Sample features data
const features = [
  {
    icon: "🚨",
    title: "Real-Time Alerts",
    description: "Get instant notifications about danger zones on your route."
  },
  {
    icon: "🗺️",
    title: "Smart Routing",
    description: "AI-powered suggestions for the safest path."
  },
  {
    icon: "👥",
    title: "Community Reports",
    description: "Contribute & verify incidents for collective safety."
  }
];

export default LandingPage;