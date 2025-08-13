import React, { useRef, useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
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

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className="App d-flex flex-column vh-100">
      <header className="d-flex justify-content-between align-items-center px-3"
              style={{height: '10vh', backgroundColor: darkMode ? '#002855' : '#4a90e2', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000}}>
        <h1 className="h4 m-0">Chatroom</h1>
        <div className="d-flex align-items-center">
          <button onClick={toggleDarkMode} className="btn btn-link p-0 me-3" title="Toggle Dark Mode">
            <img src={darkMode ? sunIcon : nightModeIcon} alt="Toggle Dark Mode" style={{width: 30, height: 30}} />
          </button>
          <SignOut />
        </div>
      </header>

      <section className={`flex-grow-1 d-flex flex-column pt-4`} style={{marginTop: '10vh', backgroundColor: darkMode ? '#1c1c1c' : 'white'}}>
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
    <div className="d-flex justify-content-center align-items-center flex-grow-1">
      <button className="btn btn-primary btn-lg" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="btn btn-danger btn-sm" onClick={() => signOut(auth)}>
      Sign Out
    </button>
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
      <main className="flex-grow-1 overflow-auto px-3 d-flex flex-column" style={{paddingBottom: '12vh'}}>
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage} className={`position-fixed bottom-0 w-100 d-flex align-items-center px-3 py-2 ${auth.currentUser && 'bg-white'}`} style={{borderTop: '1px solid #ddd', height: '10vh', backgroundColor: 'inherit'}}>
        <input 
          type="text"
          value={formValue} 
          onChange={(e) => setFormValue(e.target.value)} 
          placeholder="Write Here!" 
          className="form-control me-2" 
          style={{fontSize: '1.25rem'}}
        />
        <button type="submit" disabled={!formValue} className="btn btn-primary d-flex align-items-center justify-content-center" style={{width: '60px', height: '45px'}}>
          <img src={sendIcon} alt="Send" style={{width: 25, height: 25}} />
        </button>
      </form>
    </>
  );
}

function ChatMessage({ message }) {
  const { text, uid, photoURL, id } = message;

  const isSent = uid === auth.currentUser.uid;
  const messageClass = isSent ? 'sent' : 'received';

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
    <div className={`d-flex align-items-center my-2 ${isSent ? 'flex-row-reverse' : ''}`}>
      <img 
        src={photoURL || avatarpic} 
        alt="Avatar" 
        className="rounded-circle me-2" 
        style={{width: 40, height: 40, marginLeft: isSent ? '0.5rem' : '', marginRight: isSent ? '' : '0.5rem'}} 
      />
      <p 
        className={`p-3 rounded-pill shadow-sm mb-0 ${messageClass}`} 
        style={{maxWidth: '70%', wordWrap: 'break-word'}}
      >
        {text}
      </p>
      {isSent && (
        <button 
          onClick={handleDelete} 
          className="btn btn-link text-danger p-0 ms-2" 
          title="Delete message" 
          style={{fontSize: '1.25rem', lineHeight: 1}}
        >
          &#10006;
        </button>
      )}
    </div>
  );
}

export default App;