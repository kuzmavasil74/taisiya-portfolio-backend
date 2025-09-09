export const validate = (schema) => async (req, res, next) => {
  try {
    await Schema.validate(req.body, { abortEarly: false })
    return next()
  } catch (err) {
    return res
      .status(400)
      .json({ message: 'Validation error', errors: err.errors })
  }
}
