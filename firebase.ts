// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAS41wXsG-LIXJFKhhbrKmFVlAnBL1vRhU",
  authDomain: "oraculo-810d5.firebaseapp.com",
  projectId: "oraculo-810d5",
  storageBucket: "oraculo-810d5.firebasestorage.app",
  messagingSenderId: "695419482522",
  appId: "1:695419482522:web:8be162ff1922f4e2950a23",
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
