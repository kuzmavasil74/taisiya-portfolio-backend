import Booking from '../models/bookingModel.js'
import nodemailer from 'nodemailer'

const submitBooking = async (req, res) => {
  try {
    const { name, email, date, time, service } = req.body

    // Створіть нове замовлення в базі даних
    const newBooking = new Booking({ name, email, date, time, service })
    await newBooking.save()

    // Налаштуйте транспорту для надсилання пошти
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'New Booking Request',
      text: `New booking request:\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${time}\nService: ${service}`,
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({ message: 'Booking submitted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error submitting booking' })
  }
}

export { submitBooking }
