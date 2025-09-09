import * as yup from 'yup'

export const bookingSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .required(' Name is required')
    .trim(),
  phone: yup
    .string()
    .required(' Phone is required')
    .trim()
    .min(10)
    .max(15)
    .regex(/^\d+$/),
  telegram: yup.string().trim(),
  service: yup.string().required(' Service is required').trim(),
  date: yup.date().required(' Date is required'),
})
