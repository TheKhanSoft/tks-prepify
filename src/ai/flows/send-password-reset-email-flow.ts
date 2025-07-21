
'use server';
/**
 * @fileOverview A server-side flow for handling password reset requests.
 *
 * This flow generates a password reset link using the Firebase Admin SDK
 * and sends it to the user via a custom email template.
 */
import { adminAuth } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from '@/lib/email-provider';
import { getUserProfile } from '@/lib/user-service';

const SendPasswordResetEmailInputSchema = z.object({
  email: z.string().email().describe('The email address of the user requesting the password reset.'),
});

export type SendPasswordResetEmailInput = z.infer<typeof SendPasswordResetEmailInputSchema>;

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
  return sendPasswordResetEmailFlow(input);
}

const sendPasswordResetEmailFlow = ai.defineFlow(
  {
    name: 'sendPasswordResetEmailFlow',
    inputSchema: SendPasswordResetEmailInputSchema,
    outputSchema: z.void(),
  },
  async ({ email }) => {
    try {
      // It's important to not reveal whether the user exists or not.
      // We generate the link and send the email only if the user is found.
      // If not, we fail silently on the server to prevent email enumeration attacks.
      const userRecord = await adminAuth.getUserByEmail(email).catch(() => null);

      if (userRecord) {
        const resetLink = await adminAuth.generatePasswordResetLink(email);
        const userProfile = await getUserProfile(userRecord.uid);

        await sendEmail({
          templateId: 'forgot-password',
          to: email,
          props: {
            userName: userProfile?.name || 'Valued User',
            resetLink,
          },
        });
      } else {
        console.log(`Password reset requested for non-existent user: ${email}`);
      }
    } catch (error) {
      console.error('Error in sendPasswordResetEmailFlow:', error);
      // We do not re-throw the error to the client to prevent information leakage.
    }
  }
);
