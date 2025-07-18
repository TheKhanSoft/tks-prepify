
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EmailTemplate } from '@/types';
import { cache } from 'react';

const defaultTemplates: { [id: string]: Omit<EmailTemplate, 'id'> } = {
  'order-confirmation': {
    subject: 'Your Order Confirmation ({{orderId}})',
    body: `
      <h1>Thank You for Your Order!</h1>
      <p>Hi {{userName}},</p>
      <p>We've received your order and it is now pending payment confirmation. Here are the details:</p>
      <ul>
        <li><strong>Order ID:</strong> {{orderId}}</li>
        <li><strong>Plan:</strong> {{planName}}</li>
        <li><strong>Amount:</strong> PKR {{amount}}</li>
        <li><strong>Status:</strong> Pending Payment</li>
      </ul>
      <p>To activate your subscription, please complete the payment and send proof of the transaction to our support team.</p>
      <p>Thanks,<br>The TKS Prepify Team</p>
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
