
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EmailTemplate } from '@/types';
import { cache } from 'react';

const defaultTemplates: { [id: string]: Omit<EmailTemplate, 'id'> } = {
  'order-confirmation': {
    subject: 'Order Confirmation for {{planName}} - {{siteName}}',
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
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
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; background-color: #fff3cd; color: #856404; text-transform: capitalize;}
        .total-row { border-top: 2px solid #dee2e6; margin-top: 16px; padding-top: 16px; }
        .total-row .info-label, .total-row .info-value { font-size: 18px; font-weight: 700; }
        .button { display: inline-block; background-color: #4285F4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; text-align: center; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <!-- HEADER -->
            <tr>
                <td class="header">
                    <img src="https://i.ibb.co/C0W22m5/check-circle.png" alt="Success" width="48" height="48" style="border:0;">
                    <h1>Thank You For Your Order!</h1>
                    <p>Hi {{userName}}, your order has been placed and is now pending payment verification.</p>
                </td>
            </tr>
            <!-- CONTENT -->
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
                          <p style="color: #6c757d; line-height: 1.6; margin:0 0 16px;">To activate your subscription, please send us your proof of payment (e.g., a screenshot or receipt) via email. Please make sure to include your <strong>Order ID ({{orderId}})</strong> in your message for faster processing.</p>
                          <a href="mailto:{{contactEmail}}?subject=Payment Proof for Order {{orderId}}" class="button">Email Support</a>
                        </div>
                    </div>
                </td>
            </tr>
            <!-- FOOTER -->
            <tr>
                <td class="footer">
                    <p>&copy; {{siteName}}. All rights reserved.</p>
                </td>
            </tr>
        </table>
    </center>
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
