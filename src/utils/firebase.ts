import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from '../types';

// Initialize Firebase App instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (support default database or specified databaseId)
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const AUTHORIZED_OWNER_EMAIL = 'saahiressa@gmail.com';

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
  return errInfo;
}

// Environment Detection: Isolate development / AI Studio testing from live production
export type AppEnvironment = 'production' | 'staging';

export function getCurrentEnvironment(): AppEnvironment {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production' ? 'production' : 'staging';
  }
  const host = window.location.hostname.toLowerCase();
  // If running in AI Studio dev/pre container or local development, isolate into staging
  if (
    host.includes('run.app') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('webcontainer') ||
    host.includes('preview')
  ) {
    return 'staging';
  }
  return 'production';
}

export function getPortfolioDocPath(env: AppEnvironment = getCurrentEnvironment()): string {
  return env === 'production' ? 'portfolio/content' : 'portfolio/staging';
}

export function getPortfolioDocRef(env: AppEnvironment = getCurrentEnvironment()) {
  const docId = env === 'production' ? 'content' : 'staging';
  return doc(db, 'portfolio', docId);
}

// Test connectivity as per guidelines
export async function testConnection() {
  try {
    const activeRef = getPortfolioDocRef();
    await getDocFromServer(activeRef);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client appears offline.');
    }
  }
}

// Kick off test connection
testConnection();

export interface PortfolioData {
  profile: Profile;
  experienceNodes: ExperienceFlowNode[];
  projects: Project[];
  skills: SkillCategory[];
  sections: SectionConfig[];
  updatedAt?: string;
  updatedBy?: string;
  ownerEmail?: string;
  environment?: string;
}

/**
 * Fetch portfolio data directly from Cloud Firestore for a specified or active environment
 * Always falls back to the complementary document if the target document does not exist yet
 */
export async function fetchPortfolioFromFirestore(env: AppEnvironment = getCurrentEnvironment()): Promise<PortfolioData | null> {
  const path = getPortfolioDocPath(env);
  try {
    const portfolioDocRef = getPortfolioDocRef(env);
    const docSnap = await getDoc(portfolioDocRef);
    if (docSnap.exists() && docSnap.data()?.profile) {
      return docSnap.data() as PortfolioData;
    }
    // Fallback: If target document does not exist, check the complementary document
    // so no environment or incognito session is left with empty data
    const fallbackEnv = env === 'production' ? 'staging' : 'production';
    const fallbackRef = getPortfolioDocRef(fallbackEnv);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists() && fallbackSnap.data()?.profile) {
      return fallbackSnap.data() as PortfolioData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Real-time listener for portfolio changes across all devices
 * Seamlessly listens to fallback if the primary document is not yet published
 */
export function subscribeToPortfolio(
  onData: (data: PortfolioData) => void,
  onError?: (err: Error) => void,
  env: AppEnvironment = getCurrentEnvironment()
): Unsubscribe {
  const primaryDocId = env === 'production' ? 'content' : 'staging';
  const primaryRef = doc(db, 'portfolio', primaryDocId);
  let fallbackUnsubscribe: Unsubscribe | null = null;
  let hasReceivedPrimary = false;

  const primaryUnsubscribe = onSnapshot(
    primaryRef,
    (snapshot) => {
      if (snapshot.exists() && snapshot.data()?.profile) {
        hasReceivedPrimary = true;
        onData(snapshot.data() as PortfolioData);
      } else if (!hasReceivedPrimary) {
        // Primary doc is not yet created or empty (e.g. production not yet initialized);
        // fall back to the other doc so incognito and public visitors always see up-to-date data!
        const fallbackDocId = primaryDocId === 'content' ? 'staging' : 'content';
        const fallbackRef = doc(db, 'portfolio', fallbackDocId);
        if (!fallbackUnsubscribe) {
          fallbackUnsubscribe = onSnapshot(
            fallbackRef,
            (fbSnap) => {
              if (fbSnap.exists() && fbSnap.data()?.profile && !hasReceivedPrimary) {
                onData(fbSnap.data() as PortfolioData);
              }
            },
            (fbErr) => {
              console.warn('Fallback portfolio subscription note:', fbErr);
            }
          );
        }
      }
    },
    (error) => {
      console.warn('Portfolio subscription notice:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, getPortfolioDocPath(env));
    }
  );

  return () => {
    primaryUnsubscribe();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
}

export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      cleanObj[k] = sanitizeForFirestore(v);
    }
  }
  return cleanObj as T;
}

/**
 * Persist portfolio changes to Cloud Firestore in the active or target environment
 */
export async function savePortfolioToFirestore(
  data: {
    profile: Profile;
    experienceNodes: ExperienceFlowNode[];
    projects: Project[];
    skills: SkillCategory[];
    sections: SectionConfig[];
  },
  targetEnv: AppEnvironment = getCurrentEnvironment()
): Promise<boolean> {
  const path = getPortfolioDocPath(targetEnv);
  try {
    const portfolioDocRef = getPortfolioDocRef(targetEnv);
    const rawPayload: PortfolioData = {
      profile: data.profile,
      experienceNodes: data.experienceNodes,
      projects: data.projects,
      skills: data.skills,
      sections: data.sections,
      ownerEmail: AUTHORIZED_OWNER_EMAIL,
      environment: targetEnv,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || AUTHORIZED_OWNER_EMAIL
    };

    const cleanPayload = sanitizeForFirestore(rawPayload);

    await setDoc(portfolioDocRef, cleanPayload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Promote Staging content directly to Live Production
 */
export async function promoteStagingToProduction(): Promise<{ success: boolean; message: string }> {
  try {
    const stagingData = await fetchPortfolioFromFirestore('staging');
    if (!stagingData) {
      return { success: false, message: 'No staging data found to promote.' };
    }
    const success = await savePortfolioToFirestore(stagingData, 'production');
    if (success) {
      return { success: true, message: 'Staging changes successfully published to Live Production!' };
    }
    return { success: false, message: 'Failed to write staging data to production.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error promoting staging to production.' };
  }
}

/**
 * Pull Live Production content into Staging
 */
export async function pullProductionToStaging(): Promise<{ success: boolean; data?: PortfolioData; message: string }> {
  try {
    const prodData = await fetchPortfolioFromFirestore('production');
    if (!prodData) {
      return { success: false, message: 'No production data found.' };
    }
    const success = await savePortfolioToFirestore(prodData, 'staging');
    if (success) {
      return { success: true, data: prodData, message: 'Successfully refreshed staging with live production data!' };
    }
    return { success: false, message: 'Failed to update staging with production data.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error pulling production data.' };
  }
}

/**
 * Sign in securely via Google Popup
 */
export async function signInWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userEmail = (user.email || '').toLowerCase().trim();

    if (userEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
      // Unauthorized account: immediately sign out
      await signOut(auth);
      return {
        success: false,
        error: 'Access restricted. This Google account does not have administrator privileges.'
      };
    }

    return { success: true, user };
  } catch (err: any) {
    console.warn('Google Sign In notice:', err?.code || err?.message || err);
    let errorMessage = err?.message || 'Failed to complete Google Sign In';

    if (err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      errorMessage = `Domain unauthorized: "${currentHost}" must be added to Authorized Domains in Firebase Console. You can also log in directly using the Admin Passkey below.`;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Sign out of Firebase Auth
 */
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}
