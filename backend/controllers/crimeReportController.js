import CrimeReport from '../models/CrimeReport.js';
import User from '../models/User.js';

// Submit a crime report
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
      comments
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

// Get crime reports by user
export const getUserCrimeReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reports = await CrimeReport.find({ userId })
      .sort({ reportedAt: -1 })
      .select('-__v');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get nearby crime reports
export const getNearbyCrimeReports = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    const reports = await CrimeReport.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).sort({ reportedAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};