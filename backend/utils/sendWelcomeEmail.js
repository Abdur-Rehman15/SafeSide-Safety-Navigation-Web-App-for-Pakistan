import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USERNAME,
    clientId: process.env.CLIENT_ID,
    refreshToken: process.env.REFRESH_TOKEN,
    clientSecret: process.env.CLIENT_SECRET
  }
});

export async function sendWelcomeEmail(to, name) {
  const mailOptions = {
    from: '"SafeSide" <safesidenavigation@gmail.com>',
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
    `
  };

  return transporter.sendMail(mailOptions);
}