import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error("Missing required OAuth2 environment variables");
}

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

export async function sendWelcomeEmail(to, name) {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    
    if (!token) {
      throw new Error("Failed to retrieve access token");
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USERNAME,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: token
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to,
      subject: 'Welcome to SafeSide!',
      html: `
        <div style="max-width:500px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(63,81,181,0.08);">
          <div style="background:linear-gradient(90deg,#3f51b5 0%,#2196f3 100%);padding:24px 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:2rem;">SafeSide</h1>
          </div>
          <div style="padding:32px 24px 24px 24px;">
            <h2 style="color:#3f51b5;margin-top:0;">Welcome, ${name || "User"}!</h2>
            <p style="color:#333;font-size:1.1rem;line-height:1.6;">
              Thank you for joining <b>SafeSide</b>. We're excited to have you on board.<br>
              Your safety is our priority. Explore safe routes, review locations, and stay informed.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="https://safeside.example.com" style="background:linear-gradient(90deg,#3f51b5 0%,#2196f3 100%);color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:1rem;box-shadow:0 2px 8px rgba(33,150,243,0.12);display:inline-block;">
                Go to SafeSide
              </a>
            </div>
            <p style="color:#888;font-size:0.95rem;text-align:center;">
              If you think this is a mistake, reply to this email.<br>
              &copy; ${new Date().getFullYear()} SafeSide
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;

  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}