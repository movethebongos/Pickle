import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'apiKey',
  authDomain: 'pickle-2f9bc.firebaseapp.com',
  projectId: 'pickle-2f9bc',
  storageBucket: 'pickle-2f9bc.firebasestorage.app',
  messagingSenderId: '882374882325',
  appId: '1:882374882325:web:b685fc2a0994bf6fa8a1c',
  measurementId: 'G-R6T3WR67VY',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  if (!credential.user) {
    throw new Error('Firebase auth failed to create an anonymous user.');
  }

  return credential.user;
}
