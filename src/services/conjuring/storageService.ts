const DB_NAME = 'ConjuringStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening IndexedDB.');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }
    return dbPromise;
};

export const saveImage = async (id: string, blob: Blob): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Failed to save image to IndexedDB:", request.error);
            reject(request.error);
        }
    });
};

export const getImage = async (id: string): Promise<Blob | null> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result ? (request.result as Blob) : null);
        };
        request.onerror = () => {
            console.error("Failed to get image from IndexedDB:", request.error);
            reject(request.error);
        }
    });
};

export const deleteImage = async (id: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Failed to delete image from IndexedDB:", request.error);
            reject(request.error);
        }
    });
};

// Save generated image URL as blob
export const saveGeneratedImage = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const imageId = `generated_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        await saveImage(imageId, blob);
        return imageId;
    } catch (error) {
        console.error("Failed to save generated image:", error);
        throw error;
    }
};

// Get generated image URL from stored blob
export const getGeneratedImageUrl = async (imageId: string): Promise<string | null> => {
    try {
        const blob = await getImage(imageId);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (error) {
        console.error("Failed to get generated image URL:", error);
        return null;
    }
};
