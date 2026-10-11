import mongoose from 'mongoose'
import crypto from 'crypto'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    points: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralRewarded: { type: Boolean, default: false }, // бонус за запрошення вже нараховано
    marketingConsent: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex')
  }
  next()
})

export default mongoose.model('User', userSchema)
