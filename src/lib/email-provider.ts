
'use server';

import { Resend } from 'resend';
import { getEmailTemplate } from './email-service';
import { fetchSettings } from './settings-service';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailProps {
  templateId: string;
  to: string;
  props: Record<string, any>;
}

export async function sendEmail({ templateId, to, props }: SendEmailProps) {
  try {
    const [template, settings] = await Promise.all([
      getEmailTemplate(templateId),
      fetchSettings(),
    ]);

    if (!template || !template.isEnabled) {
      console.log(`Email template "${templateId}" is disabled or not found. Skipping send.`);
      return;
    }

    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email send.");
        return;
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

    // Replace placeholders in subject and body
    for (const key in allProps) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, allProps[key]);
      body = body.replace(regex, allProps[key]);
    }

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      subject: subject,
      html: body,
    });

    if (error) {
      console.error(`Failed to send email "${templateId}" to ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error(`General error in sendEmail for template "${templateId}":`, error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
