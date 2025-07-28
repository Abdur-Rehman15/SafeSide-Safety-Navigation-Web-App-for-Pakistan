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
        <div style="max-width:500px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(94, 53, 177, 0.1);border:1px solid rgba(94, 53, 177, 0.1);">
        <!-- Header -->
        <div style="background:#5e35b1;padding:32px 0;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:600;letter-spacing:0.5px;">Welcome to SafeSide</h1>
        </div>
        
        <!-- Content -->
        <div style="padding:32px;">
          <h2 style="color:#2d3748;margin-top:0;font-size:20px;font-weight:600;">Hello ${name || "there"},</h2>
          
          <div style="background:#f8f9fa;border-left:4px solid #ff7043;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
            <p style="color:#2d3748;margin:0;font-size:15px;line-height:1.6;">
              Thank you for trusting us with your safety. You've taken the first step towards more confident travels across Pakistan.
            </p>
          </div>
          
          <div style="margin:24px 0;">
            <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
              <div style="width:24px;height:24px;background:#5E35B1;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">
                <span style="color:#ffffff;font-size:12px;font-weight:bold;display:inline-block;line-height:24px;text-align:center;width:24px;">1</span>
              </div>
              <p style="color:#2d3748;margin:0;font-size:15px;line-height:1.6;">
                <strong>Real-time alerts</strong> about reported incidents near you
              </p>
            </div>
            
            <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
              <div style="width:24px;height:24px;background:#ff7043;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">
                <span style="color:#ffffff;font-size:12px;font-weight:bold;display:inline-block;line-height:24px;text-align:center;width:24px;">2</span>
              </div>
              <p style="color:#2d3748;margin:0;font-size:15px;line-height:1.6;">
                <strong>Security analysis</strong> of your surrounding areas
              </p>
            </div>
            
            <div style="display:flex;align-items:flex-start;">
              <div style="width:24px;height:24px;background:#5E35B1;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">
                <span style="color:#ffffff;font-size:12px;font-weight:bold;display:inline-block;line-height:24px;text-align:center;width:24px;">3</span>
              </div>
              <p style="color:#2d3748;margin:0;font-size:15px;line-height:1.6;">
                <strong>Smart routing</strong> that suggests safer routes
              </p>
            </div>
          </div>
          
          <p style="color:#4a5568;font-size:15px;line-height:1.6;margin-bottom:0;">
            We're honored you've chosen to join our safety community. Together, we're making Pakistan safer for everyone.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid rgba(94, 53, 177, 0.1);">
          <p style="color:#4a5568;font-size:13px;margin:0;line-height:1.5;">
            SafeSide Pakistan · Keeping You Protected<br>
            <span style="color:#5e35b1;">safesidenavigation@gmail.com</span> · © ${new Date().getFullYear()}<br><br>
            If you think it's a mistake, reply to this email. Thank you.
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