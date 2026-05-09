export type StoredScreenshotKind = "region" | "window" | "fullscreen";

export interface StoredScreenshot {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
  kind: StoredScreenshotKind;
  label: string;
}

const DATABASE_NAME = "admindeck.screenshots";
const DATABASE_VERSION = 1;
const STORE_NAME = "screenshots";
const SCREENSHOTS_CHANGED_EVENT = "admindeck:screenshots-changed";

type ScreenshotChangeListener = () => void;

export async function listStoredScreenshots(): Promise<StoredScreenshot[]> {
  const database = await openScreenshotDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const screenshots = await requestToPromise<StoredScreenshot[]>(store.getAll());
  await transactionDone(transaction);
  database.close();
  return screenshots.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function addStoredScreenshot(
  screenshot: Omit<StoredScreenshot, "id" | "capturedAt">,
): Promise<StoredScreenshot> {
  const stored: StoredScreenshot = {
    ...screenshot,
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
  };
  const database = await openScreenshotDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(stored);
  await transactionDone(transaction);
  database.close();
  notifyScreenshotsChanged();
  return stored;
}

export async function deleteStoredScreenshot(id: string): Promise<void> {
  const database = await openScreenshotDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
  database.close();
  notifyScreenshotsChanged();
}

export async function clearStoredScreenshots(): Promise<void> {
  const database = await openScreenshotDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();
  await transactionDone(transaction);
  database.close();
  notifyScreenshotsChanged();
}

export function subscribeToScreenshotChanges(listener: ScreenshotChangeListener) {
  window.addEventListener(SCREENSHOTS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SCREENSHOTS_CHANGED_EVENT, listener);
}

function notifyScreenshotsChanged() {
  window.dispatchEvent(new Event(SCREENSHOTS_CHANGED_EVENT));
}

function openScreenshotDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open screenshot store."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("Screenshot store request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Screenshot store transaction was aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Screenshot store transaction failed."));
    transaction.oncomplete = () => resolve();
  });
}
