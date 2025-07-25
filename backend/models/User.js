import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  emergencyNumber: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{11}$/.test(v);
        },
        message: props => `${props.value} is not a valid 11-digit emergency number!`
      }
  },
});

userSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const lastUser = await this.constructor.findOne({}, {}, { sort: { 'userId': -1 } });
    this.userId = lastUser ? lastUser.userId + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('User', userSchema);