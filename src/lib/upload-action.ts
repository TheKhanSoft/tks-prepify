
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

  // Validate file size. Firestore documents have a 1 MiB limit for the entire document.
  // We'll set a much smaller limit for the image to ensure it fits.
  const MAX_SIZE_IN_BYTES = 250 * 1024; // 250KB limit
  if (file.size > MAX_SIZE_IN_BYTES) {
    return { success: false, error: `Image is too large. Please upload an image under 250KB.` };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Double-check the final data URI size to ensure it's not too large.
    // This is an extra safeguard.
    if (Buffer.byteLength(dataUri, 'utf8') > 800 * 1024) {
       return { success: false, error: `The processed image data is too large for the database. Please use a smaller or more compressed image.` };
    }

    return { success: true, path: dataUri };
  } catch (error) {
    console.error("Error processing image to Base64:", error);
    return { success: false, error: "Failed to process the uploaded image." };
  }
}
