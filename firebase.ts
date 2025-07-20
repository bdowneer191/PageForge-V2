import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

// NOTE: In a production environment, you should use environment variables
// (e.g., import.meta.env.VITE_FIREBASE_API_KEY) to store these keys securely.
// For this setup, we are using the provided configuration directly.
const firebaseConfig = {
  apiKey: "AIzaSyBNXgnt0MISdQhu_zCJZd7pYBQZr1Wf6Rg",
  authDomain: "pageforge-86110.firebaseapp.com",
  projectId: "pageforge-86110",
  storageBucket: "pageforge-86110.firebasestorage.app",
  messagingSenderId: "233555864946",
  appId: "1:233555864946:web:2979418f2ed884a02401eb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);