import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const fallbackConfig = {
  apiKey: "AIzaSyC_GmwisMWJX_ONOXXO6O-2VrSc8ArUYdU",
  authDomain: "rakib-8cc2a.firebaseapp.com",
  projectId: "rakib-8cc2a",
  storageBucket: "rakib-8cc2a.firebasestorage.app",
  messagingSenderId: "1096544082404",
  appId: "1:1096544082404:web:b158f6f2c5ccc7eef80ff1",
  measurementId: "G-SZPL053YD7"
};

let app: any;
let db: any;
let auth: any;
let storage: any;
let analytics: any = null;
let initPromise: Promise<any> | null = null;
let isQuotaExhausted = false;

const getTodayString = () => new Date().toISOString().split('T')[0];

export const clearQuotaExhausted = () => {
  isQuotaExhausted = false;
  try {
    localStorage.removeItem('firestore_quota_exhausted_date');
  } catch (e) {}
};

export const checkIsQuotaExhausted = (): boolean => {
  if (isQuotaExhausted) return true;
  try {
    const expiredDate = localStorage.getItem('firestore_quota_exhausted_date');
    if (expiredDate === getTodayString()) {
      isQuotaExhausted = true;
      return true;
    }
  } catch (e) {}
  return false;
};

export const markQuotaExhausted = () => {
  if (isQuotaExhausted) return;
  isQuotaExhausted = true;
  try {
    localStorage.setItem('firestore_quota_exhausted_date', getTodayString());
  } catch (e) {}
  window.dispatchEvent(new Event('firestore_quota_exhausted'));
};

export interface FirestoreHealthStatus {
  isConfigured: boolean;
  canRead: boolean;
  canWrite: boolean;
  projectId: string;
  errorMessage?: string;
  errorCode?: string;
}

export const checkFirestoreHealth = async (): Promise<FirestoreHealthStatus> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      return {
        isConfigured: false,
        canRead: false,
        canWrite: false,
        projectId: fallbackConfig.projectId,
        errorMessage: 'ফায়ারবেস ডাটাবেস ইনিশিয়ালাইজ হয়নি'
      };
    }

    let canRead = false;
    let canWrite = false;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    // Test Read
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      await getDoc(doc(db, 'settings', 'brand'));
      canRead = true;
    } catch (readErr: any) {
      console.warn("Health check read test error:", readErr);
      canRead = false;
      errorMessage = readErr.message;
      errorCode = readErr.code;
    }

    // Test Write
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', '_health_check_'), {
        lastChecked: new Date().toISOString(),
        client: 'admin_health_check'
      }, { merge: true });
      canWrite = true;
    } catch (writeErr: any) {
      console.warn("Health check write test error:", writeErr);
      canWrite = false;
      errorMessage = writeErr.message;
      errorCode = writeErr.code;
    }

    return {
      isConfigured: true,
      canRead,
      canWrite,
      projectId: fallbackConfig.projectId,
      errorMessage,
      errorCode
    };
  } catch (err: any) {
    return {
      isConfigured: false,
      canRead: false,
      canWrite: false,
      projectId: fallbackConfig.projectId,
      errorMessage: err?.message || String(err),
      errorCode: err?.code
    };
  }
};

const testConnection = async (database: any) => {
  if (!database || checkIsQuotaExhausted()) return;
  try {
    // Attempt to read a non-existent doc to trigger connection check
    await getDocFromServer(doc(database, '_test_connection_', 'check'));
    console.log('Firebase connection test: SUCCESS (Backend reachable)');
  } catch (error: any) {
    const errMsg = String(error.message || '').toLowerCase();
    const errCode = String(error.code || '').toLowerCase();
    if (
      errCode === 'resource-exhausted' ||
      errCode === 'quota-exceeded' ||
      errMsg.includes('quota') ||
      errMsg.includes('limit exceeded') ||
      errMsg.includes('exhausted')
    ) {
      markQuotaExhausted();
    } else if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('backend')) {
      console.log("Firebase connection: operating in persistent offline cache mode.");
    } else {
      // Permission denied or other responses indicate the backend is reached
      console.log('Firebase connection test: SUCCESS (Backend reached, result:', error.code || 'connected', ')');
    }
  }
};

const initializeFirebase = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let config = fallbackConfig;
      
      try {
        const configFile = await import('/firebase-applet-config.json?raw' as any).catch(() => null);
        if (configFile && configFile.default) {
          const parsed = JSON.parse(configFile.default);
          if (parsed.projectId && parsed.projectId !== 'remixed-project-id' && !parsed.projectId.includes('remixed')) {
            config = parsed;
          }
        }
      } catch (e) {
        // Fall back to fallbackConfig
      }

      if (!getApps().length) {
        app = initializeApp(config);
      } else {
        app = getApps()[0];
      }

      try {
        auth = getAuth(app);
        if (auth && !auth.currentUser) {
          signInAnonymously(auth).catch(() => {});
        }
      } catch (e) {
        console.warn('Auth init warning:', e);
      }

      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
        });
      } catch (e) {
        try {
          db = getFirestore(app);
        } catch (err) {
          console.warn("getFirestore fallback:", err);
        }
      }

      try {
        storage = getStorage(app);
      } catch (e) {
        console.warn('Storage init warning:', e);
      }

      testConnection(db);

      return { app, db, auth, storage, analytics };
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return { app: null, db: null, auth: null, storage: null, analytics: null };
    }
  })();

  return initPromise;
};

const getFirebaseAuth = async () => {
  const { auth } = await initializeFirebase();
  return auth;
};

const signInWithGoogle = async () => {
  try {
    const { auth } = await initializeFirebase();
    if (!auth) {
      throw new Error("Firebase Auth not initialized. Please ensure Firebase is set up.");
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google login failed details:", error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Pop-up blocked! Please allow pop-ups for this site in your browser settings.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error("Login process was cancelled.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login window was closed before completion.");
    }
    throw error;
  }
};

export { 
  initializeFirebase, 
  getFirebaseAuth, 
  signInWithGoogle, 
  db, 
  auth, 
  storage, 
  analytics 
};
