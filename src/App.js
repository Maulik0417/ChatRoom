import React, { useRef, useState, useEffect } from 'react';
import './App.css';

import nightModeIcon from './pics/dark-mode.png';
import sunIcon from './pics/sun.png';
import sendIcon from './pics/send.png';
import avatarpic from './pics/user.png';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  orderBy, 
  query, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';

import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDbPNrpMoxEgKgh34NstKV09p-y9fZYBEY",
  authDomain: "chatroom-mann.firebaseapp.com",
  projectId: "chatroom-mann",
  storageBucket: "chatroom-mann.appspot.com",
  messagingSenderId: "452863378138",
  appId: "1:452863378138:web:2fec6ca2320f961f221be3",
  measurementId: "G-NVDFENKVZ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function App() {
  const [user] = useAuthState(auth);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="App">
      <header>
        <h1>Chatroom</h1>
        <div className="header-buttons">
          <button className="dark-mode-toggle" onClick={toggleDarkMode}>
            <img src={darkMode ? sunIcon : nightModeIcon} className="light-dark" alt="Toggle Dark Mode" />
          </button>
          <SignOut />
        </div>
      </header>
      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
    </>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => signOut(auth)}>Sign Out</button>
  );
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const q = query(messagesRef, orderBy('createdAt'));

  const [snapshot] = useCollection(q);

  const messages = snapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) || [];

  const [formValue, setFormValue] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <main>
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input 
          value={formValue} 
          onChange={(e) => setFormValue(e.target.value)} 
          placeholder="Write Here!" 
        />
        <button type="submit" disabled={!formValue}>
          <img src={sendIcon} alt="Send" className="send-icon" />
        </button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL, id } = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  const handleDelete = async () => {
    if (!id) {
      alert("Cannot delete: message id missing");
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this message?');
    if (!confirmDelete) return;

    try {
      const messageDoc = doc(firestore, 'messages', id);
      await deleteDoc(messageDoc);
    } catch (error) {
      console.error("Error deleting message: ", error);
      alert("Failed to delete message.");
    }
  };

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL || avatarpic} alt="Avatar" />
      <p>{text}</p>
      {uid === auth.currentUser.uid && (
        <button onClick={handleDelete} className="delete-button" title="Delete message">
          &#10006;
        </button>
      )}
    </div>
  );
}

export default App;