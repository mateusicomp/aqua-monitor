import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  DocumentData,
  where,
  QueryConstraint
} from 'firebase/firestore';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Última telemetria (já funcionando na Home)
 */
export const subscribeToLatestTelemetry = (
  callback: (data: DocumentData | null) => void,
  onError: (error: Error) => void
) => {
  const q = query(
    collection(db, 'telemetry'),
    orderBy('sent_at', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        callback({
          id: doc.id,
          ...doc.data()
        });
      } else {
        callback(null);
      }
    },
    onError
  );
};

/**
 * Histórico de telemetria para um site/device
 * - Busca últimos N documentos (maxPoints)
 * - Filtragem por período (24h, 7d, 30d) é feita no frontend
 */
export const subscribeToTelemetryHistory = (
  callback: (data: DocumentData[]) => void,
  onError: (error: Error) => void,
  options?: {
    deviceId?: string | null;
    siteId?: string | null;
    maxPoints?: number;
  }
) => {
  const constraints: QueryConstraint[] = [];

  if (options?.siteId) {
    constraints.push(where('site_id', '==', options.siteId));
  }

  if (options?.deviceId) {
    constraints.push(where('device_id', '==', options.deviceId));
  }

  // Ordena do mais recente para o mais antigo
  constraints.push(orderBy('sent_at', 'desc'));
  constraints.push(limit(options?.maxPoints ?? 200));

  const q = query(collection(db, 'telemetry'), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(docs);
    },
    onError
  );
};
