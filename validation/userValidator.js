import * as yup from 'yup'

export const userSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .required(' Name is required'),
  email: yup
    .string()
    .email('Invalid email format')
    .required(' Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required(' Password is required'),
})

export const updateSchema = yup.object().shape({
  name: yup.string().min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Invalid email format'),
  password: yup.string().min(6, 'Password must be at least 6 characters'),
})
