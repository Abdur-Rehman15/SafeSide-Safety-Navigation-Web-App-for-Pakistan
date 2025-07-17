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
  },
  votes: {
    upvotes: {
      type: [mongoose.Schema.Types.ObjectId], // Array of user IDs who upvoted
      default: []
    },
    downvotes: {
      type: [mongoose.Schema.Types.ObjectId], // Array of user IDs who downvoted
      default: []
    },
    score: {
      type: Number, // Calculated score (upvotes - downvotes)
      default: 0
    }
  }
});

crimeReportSchema.index({ location: '2dsphere' });

// Add a pre-save hook to update the vote score
crimeReportSchema.pre('save', function(next) {
  this.votes.score = this.votes.upvotes.length - this.votes.downvotes.length;
  next();
});

export default mongoose.model('CrimeReport', crimeReportSchema);