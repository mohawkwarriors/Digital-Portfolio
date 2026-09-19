import { getAuthHeaders } from './authClient';

/**
 * Utility for uploading images to the local server or converting to base64 Data URL.
 */
export async function uploadImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            fileBase64: base64Data,
            fileName: file.name
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            resolve(data.url);
            return;
          }
        }
      } catch (err) {
        console.warn('Server image upload failed, falling back to data URL', err);
      }
      // Fallback directly to base64 Data URL if server upload fails
      resolve(base64Data);
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}
