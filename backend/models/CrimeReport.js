import mongoose from 'mongoose';

const crimeReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  typeOfCrime: {
    type: String,
    enum: ['harassment', 'theft', 'robbery', 'other'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    trim: true,
    maxlength: 500
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

crimeReportSchema.index({ location: '2dsphere' });

export default mongoose.model('CrimeReport', crimeReportSchema);