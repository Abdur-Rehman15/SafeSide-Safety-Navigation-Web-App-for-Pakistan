import CrimeReport from '../models/CrimeReport.js';
import User from '../models/User.js';

// Submit a crime report with votes initialization
export const submitCrimeReport = async (req, res) => {
  try {
    const { typeOfCrime, longitude, latitude, severity, comments } = req.body;
    const userId = req.user.userId;

    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Please provide valid coordinates' });
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
      .sort({ reportedAt: -1 })
      .select('-__v')
      .populate('votes.upvotes', 'firstName lastName')
      .populate('votes.downvotes', 'firstName lastName');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get nearby crime reports (simplified response)
export const getNearbyCrimeReports = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance } = req.query;

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const maxDist = parseInt(maxDistance);

    if (isNaN(lng) || isNaN(lat) || isNaN(maxDist)) {
      return res.status(400).json({ message: 'Please provide valid longitude, latitude, and maxDistance query parameters.' });
    }

    const reports = await CrimeReport.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    })

    const formattedReports = reports.map(report => ({
      _id: report._id,
      typeOfCrime: report.typeOfCrime,
      severity: report.severity,
      comments: report.comments,
      location: {
        coordinates: report.location.coordinates
      }
    }));

    res.status(201).json(formattedReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};