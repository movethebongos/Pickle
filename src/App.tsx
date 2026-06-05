import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import EntryScreen from './components/EntryScreen';
import SettingsScreen from './components/SettingsScreen';
import SwipeScreen from './components/SwipeScreen';
import { db, ensureAuth } from './firebase.ts';

type RoomState = {
  code: string;
  name: string;
  isHost: boolean;
};

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [phase, setPhase] = useState<'entry' | 'settings' | 'swipe'>('entry');

  useEffect(() => {
    ensureAuth().catch((err) => {
      console.error('Firebase auth failed', err);
    });
  }, []);

  useEffect(() => {
    if (!room) {
      return;
    }

    const roomRef = doc(db, 'rooms', room.code);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();
      if ((data?.status === 'active' || data?.status === 'matched') && phase !== 'swipe') {
        setPhase('swipe');
      }
    });

    return unsubscribe;
  }, [room, phase]);

  const reset = () => {
    setRoom(null);
    setPhase('entry');
  };

  if (!room) {
    return <EntryScreen onStartRoom={(code, name, isHost) => {
      setRoom({ code, name, isHost });
      setPhase('settings');
    }} />;
  }

  if (phase === 'swipe') {
    return (
      <SwipeScreen
        code={room.code}
        isHost={room.isHost}
        onBack={reset}
        onEditSettings={() => setPhase('settings')}
      />
    );
  }

  return (
    <SettingsScreen
      code={room.code}
      name={room.name}
      isHost={room.isHost}
      onBack={reset}
      onStartPickling={() => setPhase('swipe')}
    />
  );
}
