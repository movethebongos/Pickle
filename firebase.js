// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "import.meta.env.VITE_FIREBASE_API_KEY",
  authDomain: "pickle-2f9bc.firebaseapp.com",
  projectId: "pickle-2f9bc",
  storageBucket: "pickle-2f9bc.firebasestorage.app",
  messagingSenderId: "882374882325",
  appId: "1:882374882325:web:b685fcf2a0994bf6fa8a1c",
  measurementId: "G-R6T3WR67VY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };