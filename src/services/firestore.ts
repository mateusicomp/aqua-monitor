import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  DocumentData 
} from 'firebase/firestore';


// Credential settings
const firebaseConfig = {
  apiKey: "AIzaSyB4nDY7o1yqFgwZ_pJSB0WT8attVFpnbXU",
  authDomain: "monitor-viveiro.firebaseapp.com",
  projectId: "monitor-viveiro",
  storageBucket: "monitor-viveiro.firebasestorage.app",
  messagingSenderId: "379487112181",
  appId: "1:379487112181:web:52485a91ec231dd3fcaebc",
  measurementId: "G-HEW7Z0G3DJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
