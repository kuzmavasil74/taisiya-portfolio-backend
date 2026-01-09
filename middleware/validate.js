export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false })
    next()
  } catch (err) {
    const formattedErrors = {}

    err.inner.forEach((e) => {
      if (!formattedErrors[e.path]) {
        formattedErrors[e.path] = e.message
      }
    })

    return res.status(400).json({
      message: 'Validation error',
      errors: formattedErrors,
    })
  }
}
