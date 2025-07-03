
'use server';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadHeroImage(formData: FormData) {
  const file = formData.get('heroImage') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Correctly define a relative path within the project
  const relativeUploadDir = join('images', 'site');
  const uploadDir = join(process.cwd(), 'public', relativeUploadDir);
  
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error("Failed to create directory:", error);
      return { success: false, error: "Could not create upload directory." };
    }
  }

  const uniqueFilename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
  // Create the public-facing path for the `src` attribute
  const publicPath = join('/', relativeUploadDir, uniqueFilename);
  const absolutePath = join(uploadDir, uniqueFilename);

  try {
    await writeFile(absolutePath, buffer);
    return { success: true, path: publicPath };
  } catch (error) {
    console.error("File upload to file system failed:", error);
    return { success: false, error: "File upload failed. Check server permissions." };
  }
}
