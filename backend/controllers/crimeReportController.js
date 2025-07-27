import CrimeReport from '../models/CrimeReport.js';
import User from '../models/User.js';
import { validateCrimeReportComments } from '../utils/gemini.js';

// Submit a crime report with votes initialization
export const submitCrimeReport = async (req, res) => {
  try {
    const { typeOfCrime, longitude, latitude, severity, comments } = req.body;
    const userId = req.user.userId;

    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Please provide valid coordinates' });
    }

    // Validate required fields
    if (!typeOfCrime || !comments) {
      return res.status(400).json({ message: 'Please provide both crime type and comments' });
    }

    // Validate comments using Gemini AI
    const isCommentsValid = await validateCrimeReportComments(typeOfCrime, comments);
    
    if (!isCommentsValid) {
      return res.status(400).json({ 
        message: 'The comments provided do not match the reported crime type or appear to be irrelevant. Please provide relevant details about the incident.' 
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const crimeReport = new CrimeReport({
      user: user._id,
      userId: user.userId,
      typeOfCrime,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      severity,
      comments,
      votes: {
        upvotes: [],
        downvotes: [],
        score: 0
      }
    });

    await crimeReport.save();

    res.status(201).json({
      message: 'Crime report submitted successfully',
      reportId: crimeReport._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get crime reports by user (including votes)
export const getUserCrimeReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reports = await CrimeReport.find({ userId })
      // .sort({ reportedAt: -1 })
      // .select('-__v')
      .populate('votes.upvotes', 'firstName lastName')
      .populate('votes.downvotes', 'firstName lastName');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get nearby crime reports (simplified response)
// Get nearby crime reports with security metrics
export const getNearbyCrimeReports = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance, includeMetrics = 'false' } = req.query;

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const maxDist = parseInt(maxDistance);

    if (isNaN(lng) || isNaN(lat) || isNaN(maxDist)) {
      return res.status(400).json({ 
        message: 'Please provide valid longitude, latitude, and maxDistance query parameters.' 
      });
    }

    const reports = await CrimeReport.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: maxDist
        }
      }
    });

    const formattedReports = reports.map(report => ({
      _id: report._id,
      typeOfCrime: report.typeOfCrime,
      severity: report.severity,
      comments: report.comments,
      reportedAt: report.reportedAt,
      location: {
        coordinates: report.location.coordinates
      },
      votes: {
        score: report.votes.score
      }
    }));

    // If metrics are requested, calculate them
    let securityMetrics = null;
    if (includeMetrics === 'true') {
      securityMetrics = calculateSecurityMetrics(reports);
    }

    const response = {
      reports: formattedReports,
      totalCount: formattedReports.length,
      searchRadius: maxDist / 1000, // Convert back to km
      ...(securityMetrics && { securityMetrics })
    };

    res.status(200).json(formattedReports);
  } catch (error) {
    console.error('Error fetching nearby crime reports:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to calculate security metrics
const calculateSecurityMetrics = (reports) => {
  const crimeTypes = ['theft', 'robbery', 'harassment', 'other'];
  const categoryBreakdown = {};
  
  // Initialize categories
  crimeTypes.forEach(type => {
    categoryBreakdown[type] = { 
      count: 0, 
      percentage: 25,
      severitySum: 0,
      avgSeverity: 0,
      recentReports: 0 // Reports from last 30 days
    };
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count reports by type and analyze severity
  reports.forEach(report => {
    const crimeType = report.typeOfCrime.toLowerCase();
    if (categoryBreakdown[crimeType]) {
      categoryBreakdown[crimeType].count++;
      categoryBreakdown[crimeType].severitySum += report.severity;
      
      // Count recent reports (last 30 days)
      if (new Date(report.reportedAt) >= thirtyDaysAgo) {
        categoryBreakdown[crimeType].recentReports++;
      }
    }
  });

  // Calculate security using exponential decay model to handle large numbers
  crimeTypes.forEach(type => {
    const category = categoryBreakdown[type];
    const count = category.count;
    const recentCount = category.recentReports;
    
    if (count === 0) {
      category.percentage = 25; // Full security for this category
    } else {
      // Calculate average severity for this category
      category.avgSeverity = category.severitySum / count;
      
      // Exponential decay model with multiple factors
      const basePercentage = 25;
      const decayRate = 0.12; // Base decay rate
      const severityMultiplier = category.avgSeverity / 3; // Normalize severity
      const recentActivityMultiplier = 1 + (recentCount / Math.max(count, 1)); // Recent activity impact
      
      // Combined decay factor
      const combinedDecay = decayRate * Math.sqrt(count) * severityMultiplier * recentActivityMultiplier;
      
      // Calculate using exponential decay: percentage = base * e^(-decay)
      const rawPercentage = basePercentage * Math.exp(-combinedDecay);
      
      // Ensure minimum of 1% (never 0) and round to 1 decimal
      category.percentage = Math.max(1, Math.round(rawPercentage * 10) / 10);
      
      // Round average severity
      category.avgSeverity = Math.round(category.avgSeverity * 10) / 10;
    }
  });

  // Calculate overall security percentage (max 100%)
  const overallSecurity = Math.min(100, Object.values(categoryBreakdown)
    .reduce((sum, category) => sum + category.percentage, 0));

  // Generate security insights
  const insights = generateSecurityInsights(categoryBreakdown, reports.length);

  return {
    overallSecurity: Math.round(overallSecurity * 10) / 10,
    categoryBreakdown,
    insights,
    analysisDate: new Date(),
    reportAnalyzed: reports.length,
    algorithm: 'exponential_decay_v2' // For debugging/versioning
  };
};

// Helper function to generate security insights
const generateSecurityInsights = (categoryBreakdown, totalReports) => {
  const insights = [];
  
  if (totalReports === 0) {
    insights.push({
      type: 'positive',
      message: 'No crime reports found in this area - appears to be very safe!'
    });
    return insights;
  }

  // Find the most problematic category
  let mostProblematicCategory = null;
  let highestCount = 0;
  
  Object.entries(categoryBreakdown).forEach(([type, data]) => {
    if (data.count > highestCount) {
      highestCount = data.count;
      mostProblematicCategory = { type, ...data };
    }
  });

  if (mostProblematicCategory && mostProblematicCategory.count > 0) {
    insights.push({
      type: 'warning',
      message: `${mostProblematicCategory.type} is the most reported crime type with ${mostProblematicCategory.count} reports.`
    });
    
    if (mostProblematicCategory.avgSeverity >= 4) {
      insights.push({
        type: 'danger',
        message: `High severity ${mostProblematicCategory.type} incidents reported (avg: ${mostProblematicCategory.avgSeverity.toFixed(1)}/5).`
      });
    }
  }

  // Overall safety assessment
  const overallSecurity = Object.values(categoryBreakdown)
    .reduce((sum, category) => sum + category.percentage, 0);
    
  if (overallSecurity >= 80) {
    insights.push({
      type: 'positive',
      message: 'This area appears to be quite safe based on crime report data.'
    });
  } else if (overallSecurity >= 60) {
    insights.push({
      type: 'info',
      message: 'This area has moderate safety levels. Exercise normal caution.'
    });
  } else if (overallSecurity >= 40) {
    insights.push({
      type: 'warning',
      message: 'This area has some safety concerns. Be cautious, especially during certain times.'
    });
  } else {
    insights.push({
      type: 'danger',
      message: 'This area has significant safety concerns. Consider avoiding or take extra precautions.'
    });
  }

  // Recent activity warning
  const recentActivityCount = Object.values(categoryBreakdown)
    .reduce((sum, category) => sum + category.recentReports, 0);
    
  if (recentActivityCount > totalReports * 0.6) {
    insights.push({
      type: 'warning',
      message: 'High recent criminal activity detected in this area.'
    });
  }

  return insights;
};

// Alternative endpoint specifically for security metrics
export const getLocationSecurityMetrics = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance } = req.query;

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const maxDist = parseInt(maxDistance);

    if (isNaN(lng) || isNaN(lat) || isNaN(maxDist)) {
      return res.status(400).json({ 
        message: 'Please provide valid longitude, latitude, and maxDistance query parameters.' 
      });
    }

    const reports = await CrimeReport.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: maxDist
        }
      }
    });

    const securityMetrics = calculateSecurityMetrics(reports);
    
    res.status(200).json({
      location: { longitude: lng, latitude: lat },
      searchRadius: maxDist / 1000,
      ...securityMetrics
    });

  } catch (error) {
    console.error('Error calculating security metrics:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all crime reports (admin/global view)
export const getAllCrimeReports = async (req, res) => {
  try {
    const reports = await CrimeReport.find({})
      .populate('user', 'firstName lastName email') // Optional: populate user info
      .populate('votes.upvotes', 'firstName lastName')
      .populate('votes.downvotes', 'firstName lastName');

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
