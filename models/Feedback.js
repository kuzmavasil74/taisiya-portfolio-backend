import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, match: /.+\@.+\..+/ },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, minlength: 10, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
})

const Feedback = mongoose.model('Feedback', feedbackSchema)
export default Feedback
