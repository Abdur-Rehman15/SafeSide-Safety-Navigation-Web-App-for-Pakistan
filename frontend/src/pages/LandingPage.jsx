import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { Button } from '@mui/material';
import { useAuth } from '../components/AuthContext';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import safetyTravelImg from '../assets/safety_travel.svg';

// Feature Icons
const RealTimeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 8H19C20.1046 8 21 8.89543 21 10V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V10C3 8.89543 3.89543 8 5 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 20V4C16 3.46957 15.7893 2.96086 15.4142 2.58579C15.0391 2.21071 14.5304 2 14 2H10C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EmergencyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LandingPage = () => {
  const navigate = useNavigate();
  const { setActiveModal } = useAuth();

  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <motion.div
            className="logo-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="app-logo">
              <ShieldIcon />
            </div>
            <h1 className="app-name">
              SafeSide <span>Pakistan</span>
            </h1>
          </motion.div>
        </div>
        <div className="navbar-right">
          <Button 
            variant="outlined" 
            className="nav-btn login-btn"
            onClick={() => setActiveModal('login')}
          >
            Login
          </Button>
          <Button 
            variant="contained" 
            className="nav-btn signup-btn"
            onClick={() => setActiveModal('signup')}
          >
            Sign Up
          </Button>
          <LoginModal />
          <SignupModal />
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Your <span>Safety</span> is Our <span>Priority</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Navigate in Pakistan with confidence using real-time danger alerts and travelling on safest routes.
          </motion.p>
          <div className="cta-container">
            <motion.button
              className="cta-button primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveModal('signup')}
            >
              Get Started
            </motion.button>
          </div>
        </motion.div>
        
          <img
            src={safetyTravelImg}
            alt="Safety travel illustration"
            style={{
              width: '100%',
              maxWidth: 800,
              height: 'auto',
              borderRadius: 0,
              margin: '0 auto',
              display: 'block',
              background: 'none',
              padding: 0
            }}
          />
      </section>

      {/* ===== SAFETY STATS ===== */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="features-section">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Empowering <span>Women</span> Through Technology
        </motion.h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              whileHover={{ y: -10 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="testimonials-section">
        <h2>Trusted by <span>Women</span> Across Pakistan</h2>
        <div className="testimonials-container">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="testimonial-card"
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="testimonial-content">
                <div className="quote-icon">"</div>
                <p>{testimonial.content}</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar"></div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-location">{testimonial.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
            {/* ===== FOOTER ===== */}
      <footer className="premium-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="app-logo">
              <ShieldIcon />
            </div>
            <h2 className="app-name">
              SafeSide <span>Pakistan</span>
            </h2>
          </div>
          <div className="footer-contacts">
            <a href="mailto:safesidenavigation@gmail.com" className="contact-link">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              safesidenavigation@gmail.com
            </a>
            <a href="https://linkedin.com/in/abdurrehman887/" target="_blank" rel="noopener noreferrer" className="contact-link">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 9H2V21H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              /abdurrehman887
            </a>
          </div>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} SafeSide Pakistan. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

// Shield Icon Component
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Data
const features = [
  {
    icon: <RouteIcon />,
    title: "Smart Re-Routing",
    description: "Automatically suggests safer alternative paths based on current safety data."
  },
  {
    icon: <RealTimeIcon />,
    title: "Real-Time Alerts",
    description: "Instant notifications about reported incidents along your route with details."
  },
  {
    icon: <EmergencyIcon />,
    title: "Emergency Features",
    description: "Quick-access to emergency contacts and alert system for immediate assistance."
  }
];

const stats = [
  { value: "1000+", label: "Active Users" },
  { value: "10+", label: "Cities Covered" },
  { value: "500+", label: "Verified Reports" },
  { value: "24/7", label: "Safety Monitoring" }
];

const testimonials = [
  {
    content: "SafeSide Pakistan gives me the confidence to travel alone. The community alerts have helped me avoid several unsafe areas.",
    name: "Ayesha Khan",
    location: "Lahore"
  },
  {
    content: "As a university student who travels late, this app has been a game-changer for my safety.",
    name: "Fatima Ahmed",
    location: "Karachi"
  }
];

export default LandingPage;