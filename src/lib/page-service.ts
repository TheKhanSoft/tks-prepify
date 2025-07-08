
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Page } from '@/types';
import { cache } from 'react';

const defaultPages: { [slug: string]: Omit<Page, 'id'> } = {
  'terms-of-service': {
    title: 'Terms of Service',
    content: `**Last Updated:** [Date]

Welcome to Prepify! These Terms of Service ("Terms") govern your use of the Prepify website and services (collectively, the "Service"), operated by TheKhanSoft ("we," "us," or "our"). By accessing or using our Service, you agree to be bound by these Terms.

**1. Accounts**

When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.

**2. Subscriptions**

Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set based on the type of subscription plan you select when purchasing a Subscription.

**3. User Conduct and Discussion Forums**

You agree not to use the Service to:
- Post any content that is unlawful, harmful, threatening, abusive, or otherwise objectionable.
- Impersonate any person or entity.
- Post any content that you do not have a right to make available under any law or under contractual or fiduciary relationships.
- Engage in any activity that would constitute a criminal offense or give rise to civil liability.

We reserve the right to remove any content and/or terminate user accounts for violating these guidelines.

**4. Intellectual Property**

The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of TheKhanSoft and its licensors. Our content is protected by copyright and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.

**5. Limitation of Liability**

In no event shall TheKhanSoft, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.

**6. Disclaimer**

Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.

**7. Governing Law**

These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.

**8. Changes**

We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice prior to any new terms taking effect.

**9. Contact Us**

If you have any questions about these Terms, please contact us at thekhansoft@gmail.com.`,
    metaTitle: 'Terms of Service',
    metaDescription: 'Read the Terms of Service for using the Prepify application.',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `**Last Updated:** [Date]

TheKhanSoft ("us", "we", or "our") operates the Prepify website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.

**1. Information Collection and Use**

We collect several different types of information for various purposes to provide and improve our Service to you.

**Types of Data Collected:**

*   **Personal Data:** While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to: Email address, first name and last name, and user account credentials.
*   **Usage and Performance Data:** We may collect information on how the Service is accessed and used. This data includes your test performance, such as time spent on questions, your answers, and accuracy to provide you with detailed analytics and highlight your strengths and weaknesses.
*   **AI-Generated Data:** When you use AI features for personalized feedback or resource recommendations, we process your inputs (e.g., your answers, performance data) to generate responses. We use this data to provide and improve the AI-powered features of the Service.

**2. Use of Data**

Prepify uses the collected data for various purposes:
- To provide, operate, and maintain our Service.
- To manage your account, including managing your subscriptions.
- To provide personalized feedback, analytics, and resource recommendations.
- To provide customer support and to respond to your inquiries.
- To gather analysis or valuable information so that we can improve our Service.

**3. Data Security**

The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.

**4. Service Providers**

We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), such as Google (for Genkit AI features) and Firebase (for authentication and database). These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.

**5. Children's Privacy**

Our Service does not address anyone under the age of 13 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 13.

**6. Changes to This Privacy Policy**

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.

**7. Contact Us**

If you have any questions about this Privacy Policy, please contact us at thekhansoft@gmail.com.`,
    metaTitle: 'Privacy Policy',
    metaDescription: 'Read the Privacy Policy for the Prepify application.',
  },
};

/**
 * Fetches a single page's content by its slug.
 * If the page doesn't exist in Firestore, it creates it with default content.
 */
export const getPageBySlug = cache(async (slug: string): Promise<Page> => {
  const pageDocRef = doc(db, 'pages', slug);
  try {
    const docSnap = await getDoc(pageDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      };
    } else {
      // If page doesn't exist, create it with default content
      const defaultContent = defaultPages[slug];
      if (defaultContent) {
        await setDoc(pageDocRef, defaultContent);
        return { id: slug, ...defaultContent };
      }
    }
  } catch (error) {
    console.error(`Error fetching page with slug "${slug}":`, error);
  }
  // Fallback to default if something goes wrong or slug is invalid
  return { id: slug, ...(defaultPages[slug] || { title: 'Page Not Found', content: '' }) };
});

/**
 * Updates a page's content in Firestore.
 */
export async function updatePage(slug: string, data: Partial<Omit<Page, 'id'>>) {
  const pageDocRef = doc(db, 'pages', slug);
  await setDoc(pageDocRef, data, { merge: true });
}
