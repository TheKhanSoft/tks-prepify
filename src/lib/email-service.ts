
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EmailTemplate } from '@/types';
import { cache } from 'react';

const professionalWrapper = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8f9fa; padding: 40px 0; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { padding: 40px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; color: #212529; margin: 16px 0 8px; }
        .header p { color: #6c757d; margin: 0; }
        .content { padding: 20px 40px 40px; }
        .card { border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 24px; }
        .card-header { background-color: #f8f9fa; padding: 12px 20px; border-bottom: 1px solid #e9ecef; }
        .card-header h2 { font-size: 16px; margin: 0; color: #212529; font-weight: 600; }
        .card-content { padding: 20px; }
        .info-row { display: table; width: 100%; border-bottom: 1px solid #e9ecef; padding: 12px 0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { display: table-cell; vertical-align: middle; color: #6c757d; font-size: 14px; }
        .info-value { display: table-cell; text-align: right; font-weight: 600; color: #212529; font-size: 14px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; background-color: #d1ecf1; color: #0c5460; text-transform: capitalize;}
        .total-row { border-top: 2px solid #dee2e6; margin-top: 16px; padding-top: 16px; }
        .total-row .info-label, .total-row .info-value { font-size: 18px; font-weight: 700; }
        .button { display: inline-block; background-color: #4285F4; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; text-align: center; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6c757d; }
        p { color: #6c757d; line-height: 1.6; margin:0 0 16px; }
    </style>
</head>
<body><center class="wrapper"><table class="main" width="100%">${content}</table></center></body></html>
`;

export type TemplateDetails = {
    label: string;
    description: string;
    placeholders: Record<string, string>;
};

export const emailTemplatePlaceholders: Record<string, TemplateDetails> & { common: TemplateDetails } = {
    common: {
        label: "Common",
        description: "",
        placeholders: {
            '{{siteName}}': "The name of your site from global settings.",
            '{{contactEmail}}': "Your support email from global settings.",
        }
    },
    'new-registration': {
        label: "New Registration",
        description: "Sent to users immediately after they sign up.",
        placeholders: { '{{userName}}': "The user's full name." }
    },
    'forgot-password': {
        label: "Forgot Password",
        description: "Sent when a user requests a password reset link.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{resetLink}}': "The unique link to reset the password.",
        }
    },
    'reset-password-confirmation': {
        label: "Reset Password",
        description: "Confirmation sent after a user successfully resets their password.",
        placeholders: { '{{userName}}': "The user's full name." }
    },
    'order-confirmation': {
        label: "Order Confirmation",
        description: "Sent to users after they place an order, pending payment verification.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{orderId}}': "The unique ID of the order.",
            '{{planName}}': "The name of the purchased plan.",
            '{{duration}}': "The duration label of the plan (e.g., Monthly).",
            '{{orderDate}}': "The date the order was placed.",
            '{{orderStatus}}': "The current status of the order (e.g., Pending).",
            '{{originalPrice}}': "The base price before discounts.",
            '{{discountAmount}}': "The amount discounted, if any.",
            '{{finalAmount}}': "The final amount to be paid.",
            '{{paymentMethod}}': "The payment method chosen by the user.",
        }
    },
    'new-subscription': {
        label: "Subscription Activated",
        description: "Sent by an admin after verifying payment and activating a subscription.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{planName}}': "The name of the activated plan.",
            '{{expiryDate}}': "The new expiry date of the subscription.",
        }
    },
    'subscription-renewal': {
        label: "Subscription Renewed",
        description: "Confirmation sent after a successful subscription renewal.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{planName}}': "The name of the renewed plan.",
            '{{expiryDate}}': "The new expiry date of the subscription.",
        }
    },
    'subscription-extension': {
        label: "Subscription Extended",
        description: "Sent by an admin after manually extending a subscription.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{planName}}': "The name of the extended plan.",
            '{{expiryDate}}': "The new expiry date of the subscription.",
            '{{adminRemarks}}': "Optional remarks from the admin.",
        }
    },
    'subscription-expiry': {
        label: "Subscription Expiry",
        description: "Warning sent to users before their subscription expires.",
        placeholders: {
            '{{userName}}': "The user's full name.",
            '{{planName}}': "The name of the expiring plan.",
            '{{expiryDate}}': "The date the subscription will expire.",
        }
    },
};

const defaultTemplates: { [id: string]: Omit<EmailTemplate, 'id'> } = {
  'order-confirmation': {
    subject: 'Order Confirmation for {{planName}} - {{siteName}}',
    body: professionalWrapper(`
      <tr>
          <td class="header">
              <img src="https://i.ibb.co/C0W22m5/check-circle.png" alt="Success" width="48" height="48" style="border:0;">
              <h1>Thank You For Your Order!</h1>
              <p>Hi {{userName}}, your order has been placed and is now pending payment verification.</p>
          </td>
      </tr>
      <tr>
          <td class="content">
              <div class="card">
                  <div class="card-header"><h2>Order Summary</h2></div>
                  <div class="card-content">
                      <div class="info-row"><span class="info-label">Order ID:</span><span class="info-value">{{orderId}}</span></div>
                      <div class="info-row"><span class="info-label">Plan:</span><span class="info-value">{{planName}} ({{duration}})</span></div>
                      <div class="info-row"><span class="info-label">Order Date:</span><span class="info-value">{{orderDate}}</span></div>
                      <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">{{paymentMethod}}</span></div>
                      <div class="info-row"><span class="info-label">Status:</span><span class="info-value"><span class="status-badge">{{orderStatus}}</span></span></div>
                  </div>
              </div>
              <div class="card">
                   <div class="card-header"><h2>Billing Summary</h2></div>
                   <div class="card-content">
                      <div class="info-row"><span class="info-label">Subtotal:</span><span class="info-value">PKR {{originalPrice}}</span></div>
                      <div class="info-row"><span class="info-label">Discount:</span><span class="info-value">- PKR {{discountAmount}}</span></div>
                      <div class="info-row total-row"><strong class="info-label">Total Amount:</strong><strong class="info-value">PKR {{finalAmount}}</strong></div>
                  </div>
              </div>
              <div class="card">
                  <div class="card-header"><h2>Next Steps: Submit Proof of Payment</h2></div>
                  <div class="card-content">
                    <p>To activate your subscription, please send us your proof of payment (e.g., a screenshot or receipt) via email. Please make sure to include your <strong>Order ID ({{orderId}})</strong> in your message for faster processing.</p>
                    <a href="mailto:{{contactEmail}}?subject=Payment Proof for Order {{orderId}}" class="button">Email Support</a>
                  </div>
              </div>
          </td>
      </tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Order Confirmation'),
    isEnabled: true,
  },
  'new-registration': {
    subject: 'Welcome to {{siteName}}!',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Welcome, {{userName}}!</h1><p>We're thrilled to have you join {{siteName}}.</p></td></tr>
      <tr><td class="content">
          <p>Your account has been successfully created. You can now explore our vast library of practice papers and start preparing for your exams.</p>
          <a href="https://tks-prepify.web.app/papers" class="button">Start Practicing Now</a>
          <p>If you have any questions, feel free to contact us at {{contactEmail}}.</p>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Welcome'),
    isEnabled: true,
  },
  'forgot-password': {
    subject: 'Reset Your {{siteName}} Password',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Password Reset Request</h1><p>Hi {{userName}}, you requested to reset your password.</p></td></tr>
      <tr><td class="content">
          <p>Please click the button below to set a new password. This link is valid for one hour.</p>
          <a href="{{resetLink}}" class="button">Reset Your Password</a>
          <p>If you did not request a password reset, please ignore this email or contact us at {{contactEmail}} if you have concerns.</p>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Password Reset'),
    isEnabled: true,
  },
  'reset-password-confirmation': {
    subject: 'Your {{siteName}} Password Has Been Reset',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Password Changed Successfully</h1><p>Hi {{userName}}, your password has been updated.</p></td></tr>
      <tr><td class="content">
          <p>This email confirms that the password for your account has been successfully changed. If you did not make this change, please contact our support team immediately.</p>
          <a href="mailto:{{contactEmail}}" class="button">Contact Support</a>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Password Reset Confirmation'),
    isEnabled: true,
  },
  'new-subscription': {
    subject: 'Your {{planName}} Subscription is Active!',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Subscription Activated</h1><p>Hi {{userName}}, your {{planName}} plan is now active!</p></td></tr>
      <tr><td class="content">
          <p>Thank you for your purchase. You now have full access to all the features included in the {{planName}}. Your subscription is valid until <strong>{{expiryDate}}</strong>.</p>
          <a href="https://tks-prepify.web.app/account/dashboard" class="button">Go to My Dashboard</a>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Subscription Activated'),
    isEnabled: true,
  },
  'subscription-renewal': {
    subject: 'Your {{planName}} Subscription Has Been Renewed',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Subscription Renewed</h1><p>Hi {{userName}}, your {{planName}} plan has been successfully renewed.</p></td></tr>
      <tr><td class="content">
          <p>Thank you for continuing with us. Your subscription has been extended and is now valid until <strong>{{expiryDate}}</strong>.</p>
          <a href="https://tks-prepify.web.app/account/dashboard" class="button">Go to My Dashboard</a>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Subscription Renewed'),
    isEnabled: true,
  },
  'subscription-extension': {
    subject: 'Your {{planName}} Subscription Has Been Extended',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Subscription Extended</h1><p>Hi {{userName}}, we've extended your {{planName}} plan.</p></td></tr>
      <tr><td class="content">
          <p>An administrator has extended your subscription. It is now valid until <strong>{{expiryDate}}</strong>.</p>
          <p><strong>Admin Remarks:</strong> {{adminRemarks}}</p>
          <a href="https://tks-prepify.web.app/account/dashboard" class="button">Go to My Dashboard</a>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Subscription Extended'),
    isEnabled: true,
  },
  'subscription-expiry': {
    subject: 'Your {{planName}} Subscription is Expiring Soon',
    body: professionalWrapper(`
      <tr><td class="header"><h1>Subscription Expiring Soon</h1><p>Hi {{userName}}, your {{planName}} plan will expire on {{expiryDate}}.</p></td></tr>
      <tr><td class="content">
          <p>To ensure uninterrupted access to our premium features, please renew your subscription before it expires.</p>
          <a href="https://tks-prepify.web.app/pricing" class="button">Renew Your Plan</a>
          <p>If you have any questions, feel free to contact us at {{contactEmail}}.</p>
      </td></tr>
      <tr><td class="footer"><p>&copy; {{siteName}}. All rights reserved.</p></td></tr>
    `, 'Subscription Expiry'),
    isEnabled: true,
  }
};

/**
 * Fetches an email template by its ID.
 * If it doesn't exist, it creates it with default content.
 */
export const getEmailTemplate = cache(async (id: string): Promise<EmailTemplate> => {
  const templateDocRef = doc(db, 'email_templates', id);
  try {
    const docSnap = await getDoc(templateDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { id: docSnap.id, ...data } as EmailTemplate;
    } else {
      const defaultContent = defaultTemplates[id];
      if (defaultContent) {
        await setDoc(templateDocRef, defaultContent);
        return { id, ...defaultContent };
      }
    }
  } catch (error) {
    console.error(`Error fetching email template with ID "${id}":`, error);
  }
  // Fallback to default if something goes wrong or slug is invalid
  return { id, ...(defaultTemplates[id] || { subject: 'Template not found', body: '', isEnabled: false }) };
});

/**
 * Updates an email template in Firestore.
 */
export async function updateEmailTemplate(id: string, data: Partial<Omit<EmailTemplate, 'id'>>) {
  const templateDocRef = doc(db, 'email_templates', id);
  await setDoc(templateDocRef, data, { merge: true });
}
