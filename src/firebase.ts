import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDoc, getDocFromCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Transaction, Expense, OutOfStockItem, ProductRateItem } from './types';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with persistent offline cache and long polling for reliable sandboxed connections
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');
const auth = getAuth(app);

export { app, db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserLedgerData {
  transactions: Transaction[];
  expenses: Expense[];
  shopName: string;
  updatedAt: number; // timestamp
  outOfStockItems?: OutOfStockItem[];
  productRates?: ProductRateItem[];
}

/**
 * Syncs the local ledger data to Firebase Firestore
 */
export async function uploadLedgerToCloud(
  email: string,
  transactions: Transaction[],
  expenses: Expense[],
  shopName: string,
  outOfStockItems?: OutOfStockItem[],
  productRates?: ProductRateItem[]
): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for syncing');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  const payload: UserLedgerData = {
    transactions,
    expenses,
    shopName,
    updatedAt: Date.now(),
    outOfStockItems,
    productRates,
  };
  
  try {
    await setDoc(userDocRef, payload, { merge: true });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('Failed to')) {
      console.warn('Firestore is offline. Write is queued locally:', errMsg);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Downloads the user's ledger data from Firebase Firestore
 */
export async function downloadLedgerFromCloud(email: string): Promise<UserLedgerData | null> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for downloading');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserLedgerData;
    }
    return null;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('Failed to get document')) {
      console.warn('Firestore is offline. Attempting to retrieve from cache...', errMsg);
      try {
        const cachedSnap = await getDocFromCache(userDocRef);
        if (cachedSnap.exists()) {
          console.log('Successfully retrieved ledger data from offline cache!');
          return cachedSnap.data() as UserLedgerData;
        }
      } catch (cacheError) {
        console.warn('Failed to retrieve from offline cache:', cacheError);
      }
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Log out from Firebase Auth
 */
export async function logOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmailAndPassword(email: string, pass: string): Promise<string> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const resultEmail = result.user.email;
    if (!resultEmail) {
      throw new Error('No email found.');
    }
    localStorage.setItem('hisab_khata_sync_email', resultEmail);
    return resultEmail;
  } catch (error) {
    console.error('Email Sign-In Error:', error);
    throw error;
  }
}

/**
 * Register with Email and Password
 */
export async function registerWithEmailAndPassword(email: string, pass: string): Promise<string> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const resultEmail = result.user.email;
    if (!resultEmail) {
      throw new Error('No email found.');
    }
    localStorage.setItem('hisab_khata_sync_email', resultEmail);
    return resultEmail;
  } catch (error) {
    console.error('Email Registration Error:', error);
    throw error;
  }
}

/**
 * Send Password Reset Email
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    console.error('Password Reset Error:', error);
    throw error;
  }
}

/**
 * Sign in with Google (Secure OAuth Popup)
 */
export async function loginWithGoogle(): Promise<string> {
  try {
    const provider = new GoogleAuthProvider();
    // Enable select_account prompt so they can switch accounts easily
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    const resultEmail = result.user.email;
    if (!resultEmail) {
      throw new Error('No email found in Google account.');
    }
    localStorage.setItem('hisab_khata_sync_email', resultEmail);
    return resultEmail;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Ensures the user is authenticated securely.
 * Insecure background login using deterministic passwords has been deprecated for security.
 */
export async function ensureAuthForEmail(email: string): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for authentication');
  }
  const cleanEmail = email.trim().toLowerCase();
  
  // If already authenticated as this email, do nothing
  if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() === cleanEmail) {
    return;
  }

  // Otherwise, require explicit secure sign-in (Google or Custom Password)
  throw new Error('SECURE_AUTH_REQUIRED');
}
