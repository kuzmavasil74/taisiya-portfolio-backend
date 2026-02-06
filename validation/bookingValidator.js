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
    .min(9)
    .max(15)
    .matches(/^\d+$/),
  telegram: yup.string().trim(),
  service: yup.string().required(' Service is required').trim(),
  date: yup.date().required(' Date is required'),
})
export const bookingUpdateSchema = yup.object().shape({
  name: yup.string().min(2, 'Name must be at least 2 characters').trim(),
  phone: yup
    .string()
    .trim()
    .min(9, 'Phone must be at least 9 digits')
    .max(15, 'Phone must be at most 15 digits')
    .matches(/^\d+$/, 'Phone must contain only digits'),
  telegram: yup.string().trim(),
  service: yup.string().trim(),
  date: yup.date(),
  status: yup.string().trim().oneOf(['pending', 'confirmed', 'canceled']),
})
