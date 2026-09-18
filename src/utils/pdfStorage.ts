// Robust, dependency-free client-side IndexedDB storage for the user's authentic PDF resume.
// IndexedDB easily handles 10MB+ PDF documents and persists across reloads and stateless container restarts.

const DB_NAME = 'SaahirPortfolioDB';
const DB_VERSION = 1;
const STORE_NAME = 'resume_store';
const KEY = 'original_uploaded_resume';

export interface StoredPdfRecord {
  dataUrl: string;
  fileName: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveResumePdf(dataUrl: string, fileName = 'resume.pdf'): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredPdfRecord = {
        dataUrl,
        fileName,
        updatedAt: Date.now(),
      };
      const putRequest = store.put(record, KEY);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB:', err);
  }
}

export async function getResumePdf(): Promise<StoredPdfRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Could not read PDF from IndexedDB:', err);
    return null;
  }
}

export async function clearResumePdf(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deleteRequest = store.delete(KEY);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Could not clear PDF from IndexedDB:', err);
  }
}
