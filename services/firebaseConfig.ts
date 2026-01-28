import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJ9K6sovkNzeO_fuQbSPD9LnIUG0p8Da4",
  authDomain: "financas-bispo-brito.firebaseapp.com",
  projectId: "financas-bispo-brito",
  storageBucket: "financas-bispo-brito.firebasestorage.app",
  messagingSenderId: "159834229207",
  appId: "1:159834229207:web:290d078ad03c2e025be392",
  measurementId: "G-J5VVC29364"
};

let app, auth, db;
let isConfigured = false;

// Check if config is valid
if (firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id") {
    isConfigured = true;
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // Initialize Firestore with new persistence settings (fixes deprecation warning)
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        
    } catch (error) {
        console.warn("Error initializing Firebase (Offline Mode active):", error);
        isConfigured = false;
    }
}

export { db, auth, isConfigured, onAuthStateChanged, signInAnonymously };