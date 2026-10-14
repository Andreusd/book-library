"""
Offline-First IndexedDB Storage Service for PDFs, EPUBs, and Covers.
Uses browser IndexedDB directly with Promise-based API for multi-gigabyte capacity.
"""

const DB_NAME = 'uzi_library_offline_db';
const DB_VERSION = 1;
const STORE_BOOKS = 'books_blobs';
const STORE_COVERS = 'covers_blobs';
const STORE_META = 'books_meta';
const STORE_SYNC_QUEUE = 'sync_queue';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS);
      }
      if (!db.objectStoreNames.contains(STORE_COVERS)) {
        db.createObjectStore(STORE_COVERS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { autoIncrement: true, keyPath: 'queue_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBookOffline(book, fileBlob, coverBlob) {
  const db = await openDatabase();
  const tx = db.transaction([STORE_BOOKS, STORE_COVERS, STORE_META], 'readwrite');

  tx.objectStore(STORE_BOOKS).put(fileBlob, book.id);
  if (coverBlob) {
    tx.objectStore(STORE_COVERS).put(coverBlob, book.id);
  }
  tx.objectStore(STORE_META).put({
    ...book,
    downloaded_at: Date.now(),
    offline_available: true
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBookBlobOffline(bookId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readonly');
    const req = tx.objectStore(STORE_BOOKS).get(bookId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function isBookOffline(bookId) {
  const blob = await getBookBlobOffline(bookId);
  return blob !== null;
}

export async function deleteBookOffline(bookId) {
  const db = await openDatabase();
  const tx = db.transaction([STORE_BOOKS, STORE_COVERS, STORE_META], 'readwrite');

  tx.objectStore(STORE_BOOKS).delete(bookId);
  tx.objectStore(STORE_COVERS).delete(bookId);
  tx.objectStore(STORE_META).delete(bookId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueSyncAction(actionType, payload) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const req = tx.objectStore(STORE_SYNC_QUEUE).add({
      action: actionType,
      payload,
      created_at: Date.now()
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function flushSyncQueue(apiClient) {
  if (!navigator.onLine) return;
  const db = await openDatabase();
  const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(STORE_SYNC_QUEUE);
  const req = store.getAll();

  req.onsuccess = async () => {
    const items = req.result || [];
    for (const item of items) {
      try {
        if (item.action === 'save_progress') {
          await apiClient.post(`/api/aws/books/${item.payload.book_id}/progress`, item.payload);
        } else if (item.action === 'toggle_favorite') {
          await apiClient.post(`/api/aws/books/${item.payload.book_id}/favorite`);
        }
        // Remove item from queue after successful sync
        const delTx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
        delTx.objectStore(STORE_SYNC_QUEUE).delete(item.queue_id);
      } catch (err) {
        console.warn('Sync failed for item, keeping in queue:', err);
      }
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App reconectado à internet. Disparando flush da Sync Queue...');
    // flushSyncQueue will be called by context/components
  });
}
