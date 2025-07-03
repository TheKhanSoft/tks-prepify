
'use server';

import { writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';

export async function uploadHeroImage(formData: FormData) {
  const file = formData.get('heroImage') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  // Validate that the file is an image
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'Invalid file type. Please upload an image.' };
  }

  // Set a reasonable file size limit
  const MAX_SIZE_IN_BYTES = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE_IN_BYTES) {
    return { success: false, error: `Image is too large. Please upload an image under 2MB.` };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get the file extension
    const extension = file.name.split('.').pop();
    if (!extension) {
        return { success: false, error: 'Could not determine file extension.' };
    }
    const filename = `hero-image.${extension}`;

    // Define the upload directory
    const uploadDir = join(process.cwd(), 'public', 'images', 'site');

    // Ensure the directory exists
    try {
        await stat(uploadDir);
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            await mkdir(uploadDir, { recursive: true });
        } else {
            console.error(e);
            return { success: false, error: "Could not create upload directory." };
        }
    }
    
    // Define the full path for writing the file
    const filePath = join(uploadDir, filename);

    // Write the file to the filesystem
    await writeFile(filePath, buffer);
    
    // The public path to be saved in the database
    const publicPath = `/images/site/${filename}`;

    return { success: true, path: publicPath };
  } catch (error) {
    console.error("Error processing image upload:", error);
    return { success: false, error: "Failed to process the uploaded image." };
  }
}
