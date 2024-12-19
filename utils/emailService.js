const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

exports.sendEmail = async (recipient, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient,
    subject,
    text,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('Email sent successfully')
  } catch (error) {
    throw new Error('Failed to send email: ' + error.message)
  }
}
