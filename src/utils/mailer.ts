import nodemailer from "nodemailer";
import { envConfig } from "../config/config.js";
import type { sendEmailParams } from "../types/email.js";
export const transporter = nodemailer.createTransport({
  host: envConfig.EMAIL_SMTP_HOST,
  port: envConfig.EMAIL_SMTP_PORT,
  secure: envConfig.EMAIL_SMTP_PORT === 465,
  auth: {
    user: envConfig.EMAIL_SMTP_USER,
    pass: envConfig.EMAIL_SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: sendEmailParams) => {
  await transporter.sendMail({
    from: `"${envConfig.EMAIL_FROM_NAME}" <${envConfig.EMAIL_SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
};
