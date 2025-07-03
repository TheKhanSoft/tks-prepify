
'use server';

export async function uploadHeroImage(formData: FormData) {
  const file = formData.get('heroImage') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  // Validate that the file is an image
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'Invalid file type. Please upload an image.' };
  }

  // Validate file size. Firestore documents have a 1 MiB limit.
  // Base64 encoding adds ~33% overhead, so we'll set a raw limit of 750KB.
  const MAX_SIZE_IN_BYTES = 750 * 1024;
  if (file.size > MAX_SIZE_IN_BYTES) {
    return { success: false, error: `Image is too large. Please upload an image under 750KB.` };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    return { success: true, path: dataUri };
  } catch (error) {
    console.error("Error processing image to Base64:", error);
    return { success: false, error: "Failed to process the uploaded image." };
  }
}
