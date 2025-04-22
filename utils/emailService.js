import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const sendEmail = async (recipient, subject, text) => {
  try {
    const accessToken = await oAuth2Client.getAccessToken()

    console.log('accessToken:', accessToken)
    console.log('accessToken.token:', accessToken?.token)

    if (!accessToken || !accessToken.token) {
      throw new Error('Failed to retrieve access token')
    }
    console.log('ACCESS TOKEN:', accessToken.token)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    })
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject,
      text,
    }

    await transporter.sendMail(mailOptions)
    console.log('📤 Email sent successfully')
  } catch (error) {
    console.error('❌ Failed to send email:', error.message)
  }
}
sendEmail('kuzmavasil.v@gmail.com', 'Test Subject', 'This is a test email')
export default sendEmail
