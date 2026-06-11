import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import EntryScreen from './components/EntryScreen';
import SettingsScreen from './components/SettingsScreen';
import SwipeScreen from './components/SwipeScreen';
import { db, ensureAuth, auth } from './firebase.ts';

type RoomState = {
  code: string;
  isHost: boolean;
};

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [phase, setPhase] = useState<'entry' | 'settings' | 'swipe'>('entry');
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial authentication and deep-linking check
  useEffect(() => {
    ensureAuth().catch((err) => {
      console.error('Firebase auth failed', err);
    });

    const codeFromUrl = window.location.pathname.slice(1);
    if (codeFromUrl) {
      const roomRef = doc(db, 'rooms', codeFromUrl);
      getDoc(roomRef).then((docSnap) => {
        if (docSnap.exists()) {
          setRoom({ code: codeFromUrl, isHost: false });
          const data = docSnap.data();
          if (data?.status === 'active' || data?.status === 'matched') {
            setPhase('swipe');
          } else {
            setPhase('settings');
          }
        } else {
          setError(`Room ${codeFromUrl} does not exist. Check the code and try again.`);
        }
      });
    }
  }, []);

  // 2. Stable Presence Management (Adds/removes user from the active list)
  useEffect(() => {
    if (!room || !auth.currentUser) return;

    const roomRef = doc(db, 'rooms', room.code);
    const userId = auth.currentUser.uid;

    updateDoc(roomRef, {
      activeUsers: arrayUnion(userId)
    }).catch(err => console.error("Error adding user to activeUsers:", err));

    return () => {
      updateDoc(roomRef, {
        activeUsers: arrayRemove(userId)
      }).catch(err => console.error("Error removing user from activeUsers:", err));
    };
  }, [room]);

  // 3. Stable Data Listener (Updates phase and live user count)
  useEffect(() => {
    if (!room) return;

    const roomRef = doc(db, 'rooms', room.code);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      
      // Update the active users count from the Firestore array length
      if (data?.activeUsers && Array.isArray(data.activeUsers)) {
        setActiveUsersCount(data.activeUsers.length);
      }
      
      if ((data?.status === 'active' || data?.status === 'matched') && phase !== 'swipe') {
        setPhase('swipe');
      }
    }, (err) => {
      console.error("Room listener error:", err);
    });

    return unsubscribe;
  }, [room, phase]);

  const reset = () => {
    setRoom(null);
    setPhase('entry');
    setActiveUsersCount(1);
  };

  if (!room) {
    return (
      <EntryScreen 
        error={error} 
        onStartRoom={(code, isHost) => {
          setRoom({ code, isHost });
          setPhase('settings');
        }} 
      />
    );
  }

  if (phase === 'swipe') {
    return (
      <SwipeScreen
        code={room.code}
        isHost={room.isHost}
        activeUsers={activeUsersCount}
        onBack={reset}
        onEditSettings={() => setPhase('settings')}
      />
    );
  }

  return (
    <SettingsScreen
      code={room.code}
      isHost={room.isHost}
      activeUsers={activeUsersCount}
      onBack={reset}
      onStartPickling={() => setPhase('swipe')}
    />
  );
}