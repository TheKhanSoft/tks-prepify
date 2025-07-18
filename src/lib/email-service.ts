
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EmailTemplate } from '@/types';
import { cache } from 'react';

const defaultTemplates: { [id: string]: Omit<EmailTemplate, 'id'> } = {
  'order-confirmation': {
    subject: 'Your Order Confirmation ({{orderId}})',
    body: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #1a1a1a; font-size: 24px;">Thank You for Your Order!</h1>
          <p>Hi {{userName}},</p>
          <p>We've received your order and it is now pending payment confirmation. Your subscription will be activated once the payment is verified by our team.</p>
          <h2 style="border-bottom: 2px solid #eee; padding-bottom: 5px; font-size: 20px;">Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Order ID:</td>
                <td style="padding: 10px 0; text-align: right;">{{orderId}}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Plan:</td>
                <td style="padding: 10px 0; text-align: right;">{{planName}} ({{duration}})</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Order Date:</td>
                <td style="padding: 10px 0; text-align: right;">{{orderDate}}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold;">Payment Method:</td>
                <td style="padding: 10px 0; text-align: right;">{{paymentMethod}}</td>
              </tr>
              <tr style="border-bottom: 2px solid #ccc;">
                <td style="padding: 10px 0; font-weight: bold;">Payment Status:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold;">{{orderStatus}}</td>
              </tr>
            </tbody>
          </table>
          <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 25px; font-size: 18px;">Billing Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              <tr>
                <td style="padding: 8px 0;">Subtotal:</td>
                <td style="padding: 8px 0; text-align: right;">PKR {{originalPrice}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Discount:</td>
                <td style="padding: 8px 0; text-align: right;">- PKR {{discountAmount}}</td>
              </tr>
              <tr style="border-top: 2px solid #333;">
                <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 16px;">PKR {{finalAmount}}</td>
              </tr>
            </tbody>
          </table>
          <h2 style="margin-top: 25px; font-size: 20px;">Next Steps</h2>
          <p>To activate your subscription, please complete the payment and send proof of the transaction (e.g., a screenshot or receipt) to our support team.</p>
          <p>You can reply to this email or create a new support ticket.</p>
          <p>Thanks,<br>The {{siteName}} Team</p>
        </div>
      </div>
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
