import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Wallpaper, AppearanceSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToWallpapers = (userId: string, callback: (wallpapers: Wallpaper[]) => void) => {
  const path = `users/${userId}/wallpapers`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(10));
  return onSnapshot(q, (snapshot) => {
    const wallpapers = snapshot.docs.map(doc => doc.data() as Wallpaper);
    callback(wallpapers);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const subscribeToAppearance = (userId: string, callback: (settings: AppearanceSettings) => void) => {
  const path = `users/${userId}/settings/appearance`;
  return onSnapshot(doc(db, path), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as AppearanceSettings);
    } else {
      callback({ activeWallpaperId: null, blur: 0, opacity: 100 });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const addWallpaper = async (userId: string, url: string, name: string) => {
  const wallpapersPath = `users/${userId}/wallpapers`;
  const snapshot = await getDocs(collection(db, wallpapersPath));
  
  if (snapshot.size >= 10) {
    throw new Error('Limite de 10 papéis de parede atingido.');
  }

  const id = Math.random().toString(36).substr(2, 9);
  const path = `${wallpapersPath}/${id}`;
  try {
    await setDoc(doc(db, path), {
      id,
      url,
      name,
      createdAt: Date.now()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeWallpaper = async (userId: string, wallpaperId: string) => {
  const path = `users/${userId}/wallpapers/${wallpaperId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateAppearance = async (userId: string, settings: Partial<AppearanceSettings>) => {
  const path = `users/${userId}/settings/appearance`;
  try {
    await setDoc(doc(db, path), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
