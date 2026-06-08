const firebaseConfig = {
  apiKey: "AIzaSyDmFDuA2K3MUMsz_1xL9msvLI-DbnWFk7s",
  authDomain: "ai-agent48.firebaseapp.com",
  projectId: "ai-agent48",
  storageBucket: "ai-agent48.firebasestorage.app",
  messagingSenderId: "727867103675",
  appId: "1:727867103675:web:282a8aad13a0137a8ea1d1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
