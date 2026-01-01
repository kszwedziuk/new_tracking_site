const firebaseConfig = {
  apiKey: "AIzaSyA8U3r11gS6OLwUKbO7Oo5rNyDO1tBUVlA",
  authDomain: "my-tracker-c1773.firebaseapp.com",
  projectId: "my-tracker-c1773",
  storageBucket: "my-tracker-c1773.firebasestorage.app",
  messagingSenderId: "699757789230",
  appId: "1:699757789230:web:eb64887953fea7bf46dfbf",
  measurementId: "G-K5MMV7HT2Z"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
