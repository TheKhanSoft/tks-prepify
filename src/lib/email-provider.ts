
'use server';

import nodemailer from 'nodemailer';
import { getEmailTemplate } from './email-service';
import { fetchSettings } from './settings-service';

interface SendEmailProps {
  templateId: string;
  to: string;
  props: Record<string, any>;
}

export async function sendEmail({ templateId, to, props }: SendEmailProps) {
  // Check for essential SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("****************************************************************");
    console.warn("WARNING: SMTP environment variables are not fully configured.");
    console.warn("Email sending is disabled. Please add all SMTP details to your .env file.");
    console.warn("****************************************************************");
    return { success: false, error: "Email service is not configured." };
  }

  try {
    const [template, settings] = await Promise.all([
      getEmailTemplate(templateId),
      fetchSettings(),
    ]);

    if (!template || !template.isEnabled) {
      console.log(`Email template "${templateId}" is disabled or not found. Skipping send.`);
      return { success: true, message: "Email template disabled." };
    }

    const fromName = settings.emailFromName || settings.siteName;
    const fromAddress = settings.emailFromAddress || 'noreply@yourdomain.com';

    let subject = template.subject;
    let body = template.body;

    const allProps = {
      ...props,
      siteName: settings.siteName,
      contactEmail: settings.contactEmail,
    };

    // Replace placeholders
    for (const key in allProps) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, allProps[key]);
      body = body.replace(regex, allProps[key]);
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: to,
      subject: subject,
      html: body,
    });

    return { success: true, data: info };
  } catch (error) {
    console.error(`General error in sendEmail for template "${templateId}":`, error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
