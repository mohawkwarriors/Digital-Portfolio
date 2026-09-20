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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity as per guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
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
}

const PORTFOLIO_DOC_PATH = 'portfolio/content';

/**
 * Fetch portfolio data directly from Cloud Firestore
 */
export async function fetchPortfolioFromFirestore(): Promise<PortfolioData | null> {
  try {
    const portfolioDocRef = doc(db, 'portfolio', 'content');
    const docSnap = await getDoc(portfolioDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as PortfolioData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, PORTFOLIO_DOC_PATH);
    return null;
  }
}

/**
 * Real-time listener for portfolio changes across all devices
 */
export function subscribeToPortfolio(
  onData: (data: PortfolioData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const portfolioDocRef = doc(db, 'portfolio', 'content');
  return onSnapshot(
    portfolioDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as PortfolioData);
      }
    },
    (error) => {
      console.warn('Portfolio subscription notice:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, PORTFOLIO_DOC_PATH);
    }
  );
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
 * Persist portfolio changes to Cloud Firestore
 */
export async function savePortfolioToFirestore(data: {
  profile: Profile;
  experienceNodes: ExperienceFlowNode[];
  projects: Project[];
  skills: SkillCategory[];
  sections: SectionConfig[];
}): Promise<boolean> {
  try {
    const portfolioDocRef = doc(db, 'portfolio', 'content');
    const rawPayload: PortfolioData = {
      profile: data.profile,
      experienceNodes: data.experienceNodes,
      projects: data.projects,
      skills: data.skills,
      sections: data.sections,
      ownerEmail: AUTHORIZED_OWNER_EMAIL,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || AUTHORIZED_OWNER_EMAIL
    };

    const cleanPayload = sanitizeForFirestore(rawPayload);

    await setDoc(portfolioDocRef, cleanPayload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PORTFOLIO_DOC_PATH);
    return false;
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
    console.error('Google Sign In failed:', err);
    let errorMessage = err?.message || 'Failed to complete Google Sign In';

    if (err?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      errorMessage = `Domain unauthorized: "${currentHost}" must be added to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`;
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
