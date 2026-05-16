import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();

// CRITICAL: Test connection
async function testConnection() {
  try {
    console.log("Testing Firestore connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test: Success (even if doc doesn't exist, communication established)");
  } catch (error: any) {
    console.error("Firestore Connection Error Details:", {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    if(error.message.includes('the client is offline')) {
      console.error("Please check your internet connection and Firebase configuration (projectId/databaseId).");
    }
  }
}
testConnection();
