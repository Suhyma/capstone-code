import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPURnK2OIxjGKwRvzKZeBXhSWJxQB2lxs",
  authDomain: "speechbuds-ceef2.firebaseapp.com",
  projectId: "speechbuds-ceef2",
  storageBucket: "speechbuds-ceef2.firebasestorage.app",
  messagingSenderId: "227491002589",
  appId: "1:227491002589:web:2990b5bbe3734edbb48334",
  measurementId: "G-CZF98J6DNX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
const storage = getStorage(app);

export { storage, ref, uploadBytes };
