import mongoose from 'mongoose';

const CrimeReportSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  crimeType: {
    type: String,
    enum: ['theft', 'harassment', 'assault', 'other'],
    required: true
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  description: String,
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

CrimeReportSchema.index({ location: '2dsphere' });

export default mongoose.model('CrimeReport', CrimeReportSchema);