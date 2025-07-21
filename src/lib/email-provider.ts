
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
  // Check for essential SMTP configuration in .env file
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("****************************************************************");
    console.warn("WARNING: SMTP environment variables are not fully configured.");
    console.warn("Email sending is disabled. Please add all SMTP details to your .env file.");
    console.warn("****************************************************************");
    return { success: false, error: "Email service is not configured on the server." };
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
    
    for (const key in allProps) {
      if (allProps[key] !== undefined && allProps[key] !== null) {
        const regex = new RegExp(`{{{?${key}}}}?`, 'g');
        subject = subject.replace(regex, allProps[key]);
        body = body.replace(regex, allProps[key]);
      }
    }

    // Clean up any un-replaced placeholders to avoid showing them to the user.
    body = body.replace(/{{{?[^}]+}}}?/g, '');


    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
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
    console.error(`Error in sendEmail for template "${templateId}":`, error);
    return { success: false, error: "An unexpected error occurred while trying to send the email." };
  }
}
