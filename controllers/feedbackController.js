import Feedback from '../models/Feedback.js'
import User from '../models/User.js'

export const createFeedback = async (req, res) => {
  try {
    const { rating, text, bookingId } = req.body

    if (!rating || !text) {
      return res.status(400).json({ message: 'Rating and text are required' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    const user = await User.findById(req.user.id)

    const feedback = await Feedback.create({
      name: user?.name || 'Client',
      rating,
      text,
      userId: req.user.id,
      bookingId: bookingId || null,
    })

    return res.status(201).json(feedback)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

export const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-userId')

    return res.status(200).json(feedback)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}
