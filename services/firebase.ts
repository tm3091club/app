
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { firebaseConfig } from './firebaseConfig';

const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const db = app.firestore();
export const auth = app.auth();
export const FieldValue = firebase.firestore.FieldValue;

// Configuration must be set before any other Firestore operations.
try {
    // Use long-polling to avoid network issues with gRPC-Web. This can resolve
    // "Could not reach Cloud Firestore backend" errors.
    db.settings({
        experimentalForceLongPolling: true,
    });
} catch (e) {
    console.warn("Could not set Firestore `settings`, likely because it was already initialized elsewhere.", e);
}

// Enable offline persistence. This caches data for offline access and
// provides a smoother user experience. It must also be set before other operations.
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a time.
            console.warn('Firestore persistence failed: Multiple tabs open. Offline features will be disabled.');
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the features required to enable persistence
            console.warn('Firestore persistence not supported in this browser. Offline features will be disabled.');
        }
    });
