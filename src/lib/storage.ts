import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validates connection to Firestore.
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- Error Handling ---

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}

// --- Auth Service ---

export const authService = {
  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },
  logout: () => signOut(auth)
};

// --- User Profile Service ---

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  phoneNumber?: string;
  adminPhoneContact?: string;
  inviteCode?: string;
  status: 'pending' | 'active';
  createdAt: number;
}

export const userService = {
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc(db, 'users', uid);
    try {
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as UserProfile : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  getAllUsers: (callback: (users: UserProfile[]) => void) => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
  },

  updateUserProfile: async (uid: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  createUserProfile: async (profile: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${profile.uid}`);
    }
  }
};

// --- Invite Service ---

export const inviteService = {
  checkInvite: async (code: string) => {
    try {
      const snap = await getDoc(doc(db, 'invites', code));
      if (snap.exists() && snap.data().status === 'available') {
        return snap.data();
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `invites/${code}`);
      return null;
    }
  },

  useInvite: async (code: string, uid: string) => {
    try {
      await updateDoc(doc(db, 'invites', code), {
        status: 'used',
        usedBy: uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invites/${code}`);
    }
  }
};

// --- Warehouse Service ---

export interface WarehouseItem {
  id: string;
  name: string;
  brand?: string;
  category: string;
  categoryIcon?: string;
  sku?: string;
  barcode?: string;
  location?: string;
  description?: string;
  color?: string;
  specifications?: string;
  price: number;
  currency: 'IQD' | 'USD';
  quantity: number;
  isBroken: boolean;
  lowStockThreshold: number;
  updatedAt: any;
}

export const warehouseService = {
  subscribeItems: (callback: (items: WarehouseItem[]) => void) => {
    const q = query(collection(db, 'items'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WarehouseItem[];
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'items');
    });
  },

  addItem: async (item: Omit<WarehouseItem, 'id'>) => {
    try {
      await addDoc(collection(db, 'items'), {
        ...item,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'items');
    }
  },

  updateItem: async (id: string, updates: Partial<WarehouseItem>) => {
    try {
      await updateDoc(doc(db, 'items', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `items/${id}`);
    }
  },

  deleteItem: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `items/${id}`);
    }
  }
};

// --- Logs Service ---

export interface BrokenRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  userId: string;
  userName: string;
  status: 'broken' | 'fixed' | 'returned';
  fixedDetails?: {
    isModified: boolean;
    timestamp: any;
  };
  timestamp: any;
}

export const brokenService = {
  subscribeBroken: (callback: (records: BrokenRecord[]) => void) => {
    const q = query(collection(db, 'broken_records'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrokenRecord[];
      callback(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'broken_records');
    });
  },

  addBrokenRecord: async (record: Omit<BrokenRecord, 'id' | 'timestamp' | 'status'>) => {
    try {
      await addDoc(collection(db, 'broken_records'), {
        ...record,
        status: 'broken',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'broken_records');
    }
  },

  updateBrokenRecord: async (id: string, updates: Partial<BrokenRecord>) => {
    try {
      await updateDoc(doc(db, 'broken_records', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `broken_records/${id}`);
    }
  },

  deleteBrokenRecord: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'broken_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `broken_records/${id}`);
    }
  }
};

export const logService = {
  subscribeLogs: (callback: (logs: any[]) => void) => {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });
  },

  addLog: async (log: any) => {
    try {
      await addDoc(collection(db, 'logs'), {
        ...log,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  }
};
