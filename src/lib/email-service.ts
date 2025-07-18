
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EmailTemplate } from '@/types';
import { cache } from 'react';

const defaultTemplates: { [id: string]: Omit<EmailTemplate, 'id'> } = {
  'order-confirmation': {
    subject: 'Order Confirmation: {{planName}} - {{siteName}}',
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: #f2f4f6; }
        .container { background-color: #ffffff; margin: 20px auto; padding: 20px; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; }
        .header img { height: 48px; width: 48px; }
        .header h1 { font-size: 24px; color: #111827; margin: 10px 0; }
        .header p { color: #4b5563; }
        .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 24px; }
        .summary-header { background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
        .summary-header h2 { font-size: 16px; margin: 0; color: #111827; }
        .summary-content { padding: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-row .label { color: #4b5563; }
        .info-row .value { font-weight: 600; color: #111827; }
        .total-row { padding-top: 12px; font-size: 18px; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: #fef3c7; color: #92400e; }
        .next-steps { margin-top: 24px; }
        .next-steps h2 { font-size: 16px; }
        .next-steps .button { display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
        .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://www.gstatic.com/images/icons/material/system/2x/check_circle_green_48dp.png" alt="Success">
            <h1>Thank You For Your Order!</h1>
            <p>Hi {{userName}}, your order has been placed and is now pending payment verification.</p>
        </div>
        
        <div class="summary-card">
            <div class="summary-header">
                <h2>Order Summary</h2>
            </div>
            <div class="summary-content">
                <div class="info-row">
                    <span class="label">Order ID:</span>
                    <span class="value">{{orderId}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Plan:</span>
                    <span class="value">{{planName}}</span>
                </div>
                 <div class="info-row">
                    <span class="label">Duration:</span>
                    <span class="value">{{duration}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Order Date:</span>
                    <span class="value">{{orderDate}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Payment Status:</span>
                    <span class="value">
                        <span class="status-badge">{{orderStatus}}</span>
                    </span>
                </div>
                <div class="info-row total-row">
                    <strong class="label">Subtotal:</strong>
                    <strong class="value">PKR {{originalPrice}}</strong>
                </div>
                <div class="info-row">
                    <span class="label">Discount:</span>
                    <span class="value">- PKR {{discountAmount}}</span>
                </div>
                <div class="info-row total-row" style="font-size: 20px; border-top: 2px solid #d1d5db; margin-top: 10px;">
                    <strong class="label">Total Amount:</strong>
                    <strong class="value">PKR {{finalAmount}}</strong>
                </div>
            </div>
        </div>

        <div class="next-steps">
            <h2>Next Steps: Submit Proof of Payment</h2>
            <p style="color: #4b5563;">To activate your subscription, please send us your proof of payment (e.g., a screenshot or receipt) using one of the methods below. Please make sure to include your Order ID in your message.</p>
            <a href="mailto:{{contactEmail}}?subject=Payment Proof for Order {{orderId}}" class="button">Email Us</a>
        </div>

        <div class="footer">
            <p>&copy; {{siteName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `,
    isEnabled: true,
  },
};

/**
 * Fetches an email template by its ID.
 * If it doesn't exist, it creates it with default content.
 */
export const getEmailTemplate = cache(async (id: string): Promise<EmailTemplate | null> => {
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
  return null;
});

/**
 * Updates an email template in Firestore.
 */
export async function updateEmailTemplate(id: string, data: Partial<Omit<EmailTemplate, 'id'>>) {
  const templateDocRef = doc(db, 'email_templates', id);
  await setDoc(templateDocRef, data, { merge: true });
}
