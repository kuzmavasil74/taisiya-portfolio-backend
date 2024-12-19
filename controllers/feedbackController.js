const Feedback = require('../models/Feedback')

exports.createFeedback = async (req, res, next) => {
  try {
    const { name, email, rating, comment } = req.body

    const newFeedback = new Feedback({ name, email, rating, comment })
    await newFeedback.save()

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: newFeedback,
    })
  } catch (error) {
    next(error)
  }
}

exports.getFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 })
    res.status(200).json(feedbacks)
  } catch (error) {
    next(error)
  }
}
