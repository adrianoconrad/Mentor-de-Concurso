import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Folder, SavedMap } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToFolders = (userId: string, callback: (folders: Folder[]) => void) => {
  const foldersPath = `users/${userId}/folders`;
  const q = query(collection(db, foldersPath), orderBy('createdAt', 'desc'));
  
  const nestedUnsubscribers: Record<string, () => void> = {};
  const folderDataMap: Record<string, Folder> = {};

  const emit = (snapshot: any) => {
    // Only emit when we have data for all IDs currently in the main snapshot
    const currentIds = snapshot.docs.map((doc: any) => doc.id);
    const sortedFolders = currentIds
      .map((id: string) => folderDataMap[id])
      .filter((f: any) => !!f);
    
    // We only call the callback if we have at least tried to load maps for all folders
    // or if there are no folders at all.
    if (sortedFolders.length === currentIds.length) {
      callback(sortedFolders);
    }
  };

  // Main listener for folders
  const unsubscribeFolders = onSnapshot(q, (snapshot) => {
    const currentFolderIds = snapshot.docs.map(doc => doc.id);
    
    // 1. Clean up stale listeners and data
    Object.keys(nestedUnsubscribers).forEach(id => {
      if (!currentFolderIds.includes(id)) {
        nestedUnsubscribers[id]();
        delete nestedUnsubscribers[id];
        delete folderDataMap[id];
      }
    });

    if (snapshot.docs.length === 0) {
      callback([]);
      return;
    }

    // 2. Setup/Keep listeners for current folders
    snapshot.docs.forEach((folderDoc) => {
      const folderId = folderDoc.id;
      const folderRefData = folderDoc.data();

      if (nestedUnsubscribers[folderId]) {
        // Just update the name/metadata if changed
        if (folderDataMap[folderId]) {
          folderDataMap[folderId] = {
            ...folderDataMap[folderId],
            id: folderId,
            name: folderRefData.name
          };
        }
        return;
      }

      const mapsPath = `${foldersPath}/${folderId}/maps`;
      const mapsQuery = query(collection(db, mapsPath), orderBy('createdAt', 'desc'));

      nestedUnsubscribers[folderId] = onSnapshot(mapsQuery, (mapsSnapshot) => {
        const maps = mapsSnapshot.docs.map(d => ({
          ...(d.data() as SavedMap),
          id: d.id // Ensure we use document ID
        }));
        
        folderDataMap[folderId] = {
          id: folderId,
          name: folderRefData.name,
          maps: maps
        };
        
        emit(snapshot);
      }, (err) => console.error(`Error in maps listener for ${folderId}:`, err));
    });

    // Initial emit in case some folders already had data (unlikely but safe)
    emit(snapshot);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, foldersPath);
  });

  return () => {
    unsubscribeFolders();
    Object.values(nestedUnsubscribers).forEach(unsub => unsub());
  };
};

export const addFolder = async (userId: string, name: string) => {
  const id = Math.random().toString(36).substr(2, 9);
  const path = `users/${userId}/folders/${id}`;
  try {
    await setDoc(doc(db, path), {
      id,
      name,
      createdAt: Date.now()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeFolder = async (userId: string, folderId: string) => {
  const path = `users/${userId}/folders/${folderId}`;
  console.log(`Service: Attempting to remove folder at ${path}`);
  try {
    await deleteDoc(doc(db, path));
    console.log(`Service: Folder ${folderId} removed successfully`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const addMapToFolder = async (userId: string, folderId: string, map: SavedMap) => {
  const path = `users/${userId}/folders/${folderId}/maps/${map.id}`;
  try {
    await setDoc(doc(db, path), map);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeMapFromFolder = async (userId: string, folderId: string, mapId: string) => {
  const path = `users/${userId}/folders/${folderId}/maps/${mapId}`;
  console.log(`Service: Attempting to remove map at ${path}`);
  try {
    await deleteDoc(doc(db, path));
    console.log(`Service: Map ${mapId} removed successfully from folder ${folderId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
