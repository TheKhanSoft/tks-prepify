
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

  // A very strict size limit to avoid Firestore document size issues.
  // Firestore documents have a 1 MiB limit. We need space for other settings too.
  const MAX_SIZE_IN_BYTES = 150 * 1024; // 150KB limit
  if (file.size > MAX_SIZE_IN_BYTES) {
    return { success: false, error: `Image is too large. Please upload an image under 150KB.` };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Final check on the generated data URI size. 
    // This is an extra safeguard against exceeding Firestore limits.
    const dataUriSize = Buffer.byteLength(dataUri, 'utf8');
    if (dataUriSize > 750 * 1024) { // 750KB, should be very safe
       return { success: false, error: `The processed image data is too large for the database. Please use a smaller or more compressed image.` };
    }

    return { success: true, path: dataUri };
  } catch (error) {
    console.error("Error processing image to Base64:", error);
    return { success: false, error: "Failed to process the uploaded image." };
  }
}
