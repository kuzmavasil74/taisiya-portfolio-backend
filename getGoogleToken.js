import { google } from 'googleapis'
import readline from 'readline'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

const SCOPES = ['https://www.googleapis.com/auth/gmail.send']

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
})

console.log('Authorize this app by visiting this URL:\n', authUrl)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('\nEnter the code from that page here: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await oAuth2Client.getToken(code)
    console.log('\n✅ Refresh Token:\n', tokens.refresh_token)
  } catch (error) {
    console.error('❌ Error retrieving access token', error)
  }
})
