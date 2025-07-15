import express from 'express';
import { 
  submitCrimeReport, 
  getUserCrimeReports,
  getNearbyCrimeReports
} from '../controllers/crimeReportController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/submit-report', protect, submitCrimeReport);
router.get('/my-reports', protect, getUserCrimeReports);
router.get('/nearby-reports', getNearbyCrimeReports);

export default router;