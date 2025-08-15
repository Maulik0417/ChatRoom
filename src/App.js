import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  updateDoc,
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
  const [formValue, setFormValue] = useState('');
  const [editingId, setEditingId] = useState(null);

  const messages = useMemo(() => {
    return snapshot?.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) || [];
  }, [snapshot]);

useEffect(() => {
  if (dummy.current) {
    const scrollContainer = dummy.current.parentElement;
    const headerHeight = window.innerHeight * 0.1; // 10vh header height
    // Scroll so dummy is just below the header:
    scrollContainer.scrollTo({
      top: dummy.current.offsetTop - headerHeight,
      behavior: 'smooth',
    });
  }
}, [messages]);

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
  };

  return (
    <>
      {/* Message area */}
      <div
        className="flex-grow-1 overflow-auto px-3 d-flex flex-column chat-messages"
        style={{ minHeight: 0 }}
      >
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            editingId={editingId}
            setEditingId={setEditingId}
          />
        ))}
        <span ref={dummy}></span>
      </div>

      {/* Form area */}
      <form
        onSubmit={sendMessage}
        className="chat-form w-100 d-flex align-items-center px-3 py-2"
        style={{
          height: '60px',
          position: 'sticky',
          bottom: 0,
          zIndex: 999,
        }}
      >
        <input
          type="text"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Write Here!"
          className="form-control me-2"
          style={{ fontSize: '1.25rem' }}
        />
        <button
          type="submit"
          disabled={!formValue}
          className="btn btn-primary d-flex align-items-center justify-content-center"
          style={{ width: '60px', height: '45px' }}
        >
          <img src={sendIcon} alt="Send" style={{ width: 25, height: 25 }} />
        </button>
      </form>
    </>
  );
}

function ChatMessage({ message, editingId, setEditingId }) {
  const { text, uid, photoURL, id } = message;
  const isSent = uid === auth.currentUser.uid;
  const messageClass = isSent ? 'sent' : 'received';

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [editText, setEditText] = useState(text);
  const contextRef = useRef();

  const touchTimerRef = useRef(null);

  // Right-click for desktop
  const handleContextMenu = (e) => {
    if (!isSent) return;

    e.preventDefault();
    setMenuPosition({ x: e.pageX, y: e.pageY });
    setContextMenuVisible(true);
  };

  // Long-press for mobile
  const startTouchTimer = (e) => {
    if (!isSent) return;

    touchTimerRef.current = setTimeout(() => {
      e.preventDefault();
      const touch = e.touches[0];
      setMenuPosition({ x: touch.pageX, y: touch.pageY });
      setContextMenuVisible(true);
    }, 600);
  };

  const cancelTouchTimer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Hide context menu when clicking outside
  const handleClickOutside = (e) => {
    if (contextRef.current && !contextRef.current.contains(e.target)) {
      setContextMenuVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    setContextMenuVisible(false);
    if (!id) return alert("Cannot delete: message id missing");

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

  const handleEdit = () => {
    setContextMenuVisible(false);
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = async () => {
    if (!id) return;

    try {
      const messageDoc = doc(firestore, 'messages', id);
      await addDoc(collection(firestore, 'edits'), {
        previousText: text,
        newText: editText,
        editedAt: serverTimestamp(),
      });
      await updateDoc(messageDoc, { text: editText });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating message: ", error);
      alert("Failed to update message.");
    }
  };

  return (
    <div
      className={`d-flex align-items-center my-2 ${isSent ? 'flex-row-reverse' : ''}`}
      onContextMenu={handleContextMenu}
      onTouchStart={startTouchTimer}
      onTouchEnd={cancelTouchTimer}
      onTouchMove={cancelTouchTimer}
      onTouchCancel={cancelTouchTimer}
    >
      <img
        src={photoURL || avatarpic}
        alt="Avatar"
        className="rounded-circle me-2"
        style={{ width: 40, height: 40 }}
      />

      {editingId === id ? (
        <div style={{ maxWidth: '70%' }}>
          <input
            className="form-control"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <div className="mt-1 d-flex justify-content-end gap-2">
            <button className="btn btn-sm btn-success" onClick={handleSaveEdit}>Save</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <p
          className={`p-3 rounded-pill shadow-sm mb-0 ${messageClass}`}
          style={{
            maxWidth: '70%',
            minWidth: '70px',
            maxHeight: '100%',
            wordWrap: 'break-word',
            marginRight: isSent ? '10px' : '0',
            textAlign: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {text}
        </p>
      )}

      {contextMenuVisible && (
        <div
          ref={contextRef}
          className="context-menu position-absolute bg-white border rounded shadow-sm"
          style={{
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 9999,
            minWidth: '120px'
          }}
        >
          <button className="dropdown-item" onClick={handleEdit}>Edit</button>
          <button className="dropdown-item text-danger" onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default App;