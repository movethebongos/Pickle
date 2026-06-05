import { useState } from 'react';
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase.ts';
import AppShell, { GlassPanel } from './AppShell.tsx';
import GlassButton from './GlassButton.tsx';

const CODE_LENGTH_MIN = 4;
const CODE_LENGTH_MAX = 6;
const CODE_CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomRoomCode(): string {
  const length = Math.floor(Math.random() * (CODE_LENGTH_MAX - CODE_LENGTH_MIN + 1)) + CODE_LENGTH_MIN;
  return Array.from({ length }, () => CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)]).join('');
}

interface EntryScreenProps {
  onStartRoom: (roomCode: string, name: string, isHost: boolean) => void;
}

export default function EntryScreen({ onStartRoom }: EntryScreenProps) {
  const [name, setName] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const createRoom = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name before starting a room.');
      return;
    }

    setLoading(true);
    try {
      const user = await ensureAuth();
      let code = randomRoomCode();
      let attempt = 0;
      while (attempt < 6) {
        const roomRef = doc(db, 'rooms', code);
        const roomSnapshot = await getDoc(roomRef);
        if (!roomSnapshot.exists()) {
          await setDoc(roomRef, {
            code,
            hostName: name.trim(),
            isHost: true,
            createdAt: serverTimestamp(),
            active: true,
            status: 'pending',
            activeUsers: [user.uid],
          });
          onStartRoom(code, name.trim(), true);
          return;
        }
        code = randomRoomCode();
        attempt += 1;
      }

      setError('Unable to create a unique room code. Try again.');
    } catch (err) {
      console.error('Create room failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not start the room. ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    setError('');
    const trimmedName = name.trim();
    const trimmedCode = shortcode.trim().toUpperCase();

    if (!trimmedName) {
      setError('Your name is required to join a room.');
      return;
    }
    if (!trimmedCode) {
      setError('Please enter a room shortcode to join.');
      return;
    }

    setJoinLoading(true);
    try {
      const user = await ensureAuth();
      const roomRef = doc(db, 'rooms', trimmedCode);
      const roomSnapshot = await getDoc(roomRef);
      if (!roomSnapshot.exists()) {
        setError(`Room ${trimmedCode} does not exist. Check the code and try again.`);
        return;
      }

      await updateDoc(roomRef, {
        activeUsers: arrayUnion(user.uid),
      });

      onStartRoom(trimmedCode, trimmedName, false);
    } catch (err) {
      console.error('Join room failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Unable to join the room. ${message}`);
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <AppShell narrow>
      <div className="flex flex-col gap-8">
        <header className="space-y-4 text-center">
          <p className="pickle-eyebrow">Pickle live room</p>
          <h1 className="pickle-title text-4xl sm:text-5xl">
            <svg className="pickleLogo" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="42.272px" height="38.553px" viewBox="0 0 42.272 38.553" enable-background="new 0 0 42.272 38.553" xml:space="preserve"><path fill-rule="evenodd" clip-rule="evenodd" fill="#00A551" d="M5.264,6.054C2.977,6.718,1.145,6.287,0,3.986 c1.055-0.71,2.178-1.182,3.461-1.078c1.323,0.109,2.246,0.915,3.028,1.875c0-0.663-0.043-1.323,0.009-1.976 C6.57,1.9,6.975,1.113,7.55,0.417c0.368-0.445,0.823-0.541,1.165-0.254C9.06,0.45,9.057,0.922,8.707,1.359 c-0.744,0.931-0.994,2.173-0.61,3.11c0.089-0.012,0.188-0.013,0.282-0.038c3.368-0.889,6.265,0.052,8.814,2.292 c1.19,1.047,2.069,2.344,2.824,3.724c0.149,0.271,0.319,0.446,0.621,0.549c1.012,0.348,1.642,1.366,1.478,2.43 c-0.061,0.4,0.012,0.705,0.265,0.995c0.144,0.164,0.271,0.342,0.391,0.522c0.336,0.505,0.708,0.864,1.383,0.974 c1.018,0.167,1.627,1.011,1.754,2.069c0.023,0.19,0.135,0.427,0.282,0.534c0.874,0.62,1.766,1.216,2.666,1.797 c0.144,0.092,0.385,0.109,0.558,0.069c1.156-0.286,2.174,0.129,2.813,1.13c0.124,0.192,0.368,0.371,0.587,0.425 c1.139,0.288,2.314,0.443,3.425,0.805c3.302,1.079,5.484,3.238,5.956,6.775c0.385,2.885-0.693,5.269-2.951,7.089 c-1.708,1.375-3.738,1.872-5.884,1.933c-3.342,0.098-6.548-0.615-9.622-1.863c-1.619-0.656-3.155-1.516-4.732-2.275 c-0.157-0.074-0.355-0.132-0.522-0.111c-1.547,0.204-2.468-0.42-2.849-1.93c-0.035-0.136-0.148-0.273-0.263-0.368 c-0.875-0.736-1.754-1.473-2.648-2.188c-0.144-0.115-0.354-0.193-0.54-0.207c-1.307-0.093-2.154-0.935-2.268-2.255 c-0.017-0.184-0.089-0.394-0.204-0.538c-0.814-1.038-1.636-2.07-2.479-3.083c-0.161-0.196-0.404-0.368-0.643-0.44 c-1.166-0.351-1.871-1.343-1.701-2.54c0.055-0.379-0.026-0.67-0.213-0.98c-1.016-1.685-1.826-3.464-2.183-5.412 C1.925,11.23,2.765,8.533,5.042,6.3C5.12,6.224,5.189,6.137,5.264,6.054z M32.696,37.032c1.26,0.021,2.49-0.138,3.681-0.552 c3.253-1.137,5.067-4.489,4.127-7.71c-0.765-2.626-2.683-4.044-5.214-4.731c-1.242-0.336-2.508-0.587-3.764-0.877 c-0.285-0.066-0.464-0.187-0.523-0.529c-0.142-0.788-0.834-1.035-1.519-0.61c-0.149,0.092-0.426,0.126-0.578,0.055 c-1.576-0.782-3.02-1.773-4.354-2.925c-0.216-0.187-0.293-0.359-0.213-0.67c0.192-0.736-0.354-1.32-1.064-1.122 c-0.365,0.101-0.552-0.026-0.736-0.27c-0.688-0.912-1.366-1.833-2.056-2.747c-0.161-0.213-0.158-0.388-0.012-0.624 c0.377-0.613,0.052-1.34-0.661-1.389c-0.463-0.032-0.64-0.253-0.826-0.612c-0.978-1.904-2.174-3.638-4.023-4.806 c-2.344-1.478-4.815-1.837-7.354-0.581c-2.855,1.415-4.279,4.604-3.592,7.857c0.423,1.996,1.317,3.796,2.375,5.521 c0.189,0.306,0.25,0.546,0.086,0.912c-0.106,0.242-0.059,0.662,0.095,0.877c0.141,0.199,0.523,0.328,0.785,0.308 c0.309-0.025,0.434,0.089,0.595,0.293c1.101,1.383,2.206,2.764,3.324,4.132c0.196,0.239,0.312,0.417,0.217,0.76 c-0.191,0.695,0.359,1.248,1.037,1.041c0.351-0.109,0.526,0.025,0.756,0.219c1.147,0.957,2.296,1.909,3.465,2.835 c0.273,0.219,0.417,0.399,0.391,0.779c-0.052,0.819,0.633,1.217,1.34,0.8c0.221-0.13,0.379-0.121,0.594,0.003 c0.775,0.451,1.55,0.908,2.348,1.317C24.969,35.795,28.693,36.934,32.696,37.032z"></path><path fill-rule="evenodd" clip-rule="evenodd" fill="#00A551" d="M32.736,35.571c-3.353-0.104-6.461-0.917-9.421-2.298 c-7.302-3.407-12.714-8.806-16.53-15.847c-0.698-1.287-1.266-2.645-1.422-4.125c-0.231-2.18,0.47-4,2.271-5.274 c1.737-1.23,3.638-1.23,5.547-0.414c1.766,0.756,2.991,2.111,3.934,3.742c0.587,1.018,1.113,2.067,1.72,3.074 c2.772,4.584,6.525,8.046,11.624,9.878c1.288,0.463,2.651,0.716,3.988,1.035c1.576,0.374,3.012,0.984,3.969,2.373 c1.761,2.545,0.754,5.987-2.096,7.212C35.152,35.427,33.922,35.574,32.736,35.571z M10.837,8.547 C9.94,8.536,9.578,8.783,9.561,9.259c-0.02,0.496,0.339,0.759,1.027,0.775c1.446,0.033,2.533,0.702,3.341,1.875 c0.331,0.478,0.719,0.593,1.094,0.334c0.341-0.233,0.404-0.69,0.114-1.122C14.056,9.513,12.546,8.65,10.837,8.547z M21.491,23.32 c-0.067,0.371,0.059,0.653,0.45,0.699c0.376,0.046,0.523-0.236,0.595-0.558c0.146-0.641-0.118-1.326-0.653-1.677 c-0.519-0.339-1.213-0.331-1.717,0.029c-0.257,0.181-0.434,0.414-0.26,0.736c0.172,0.316,0.437,0.311,0.746,0.178 C21.219,22.483,21.518,22.705,21.491,23.32z M30.295,32.755c1.185-0.046,1.967-1.228,1.455-2.22 c-0.132-0.262-0.336-0.411-0.63-0.325c-0.29,0.083-0.385,0.296-0.345,0.604c0.089,0.751-0.133,0.927-0.895,0.72 c-0.305-0.081-0.518,0.022-0.639,0.29c-0.117,0.259-0.043,0.506,0.207,0.633C29.714,32.588,30.011,32.658,30.295,32.755z  M21.021,29.437c0.345-0.161,0.708-0.296,1.03-0.498c0.262-0.163,0.331-0.445,0.135-0.716c-0.179-0.247-0.417-0.265-0.69-0.129 c-0.656,0.327-0.93,0.166-0.978-0.564c-0.019-0.305-0.16-0.503-0.458-0.537c-0.331-0.038-0.507,0.172-0.575,0.472 C19.281,28.375,20.056,29.35,21.021,29.437z M14.938,23.797c0.043,0,0.086,0.003,0.131,0c0.538-0.026,0.854-0.259,0.844-0.618 c-0.008-0.377-0.215-0.486-0.84-0.449c-0.486,0.032-0.728-0.299-0.552-0.799c0.118-0.331,0.055-0.578-0.256-0.722 c-0.339-0.158-0.549,0.055-0.702,0.325C12.984,22.572,13.728,23.792,14.938,23.797z M9.388,17.005 c0.083-0.081,0.333-0.214,0.376-0.398c0.038-0.16-0.115-0.444-0.27-0.551c-0.601-0.413-0.64-0.592-0.138-1.142 c0.03-0.03,0.082-0.062,0.083-0.095c0.011-0.19,0.081-0.426-0.006-0.554c-0.089-0.129-0.35-0.229-0.512-0.204 c-0.575,0.087-1.056,0.887-0.984,1.563C8.013,16.323,8.645,16.996,9.388,17.005z M33.893,28.04c0.438-0.026,0.636,0.161,0.667,0.646 c0.021,0.325,0.13,0.584,0.492,0.602c0.377,0.014,0.535-0.239,0.569-0.581c0.104-0.995-0.803-1.887-1.789-1.766 c-0.572,0.068-0.854,0.284-0.834,0.641C33.016,27.947,33.263,28.074,33.893,28.04z M13.742,16.634 c-0.406,0.003-0.719,0.313-0.718,0.716c0,0.414,0.339,0.762,0.735,0.758c0.39-0.004,0.71-0.33,0.722-0.729 C14.491,16.964,14.162,16.634,13.742,16.634z M27.808,26.035c-0.015-0.394-0.388-0.728-0.791-0.701 c-0.374,0.022-0.676,0.351-0.67,0.725c0.003,0.405,0.365,0.753,0.762,0.73C27.494,26.768,27.822,26.415,27.808,26.035z  M25.697,31.64c0.408,0,0.725-0.306,0.73-0.705c0.006-0.408-0.331-0.751-0.736-0.753c-0.4-0.006-0.722,0.311-0.728,0.704 C24.96,31.3,25.291,31.64,25.697,31.64z M19.147,18.144c-0.007-0.421-0.332-0.748-0.74-0.742c-0.394,0.007-0.699,0.328-0.698,0.733 c0.001,0.417,0.33,0.744,0.744,0.736C18.861,18.865,19.154,18.556,19.147,18.144z M15.887,14.572 c0.404,0.007,0.712-0.299,0.713-0.71c0.003-0.422-0.316-0.736-0.744-0.733c-0.384,0.003-0.68,0.293-0.696,0.687 C15.143,14.225,15.469,14.566,15.887,14.572z M36.461,31.697c-0.003-0.414-0.34-0.732-0.76-0.719 c-0.396,0.012-0.695,0.34-0.684,0.745c0.008,0.399,0.339,0.707,0.735,0.696C36.167,32.408,36.467,32.103,36.461,31.697z"></path></svg>
            Pickle</h1>
          <p className="pickle-subtitle mx-auto max-w-md text-base sm:text-lg">
            Start or join a swipe room with a secure shortcode and get ready to choose the next movie.
          </p>
        </header>

        <GlassPanel>
          <div className="grid gap-5">
            <label className="grid gap-2 text-left">
              <span className="text-sm font-medium text-[var(--pickle-text-muted)]">Your name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="glass-input"
              />
            </label>

            <GlassButton block accent disabled={loading} onClick={createRoom}>
              {loading ? 'Creating room…' : 'Start Room'}
            </GlassButton>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="grid gap-5">
            <p className="text-left text-sm font-medium text-[var(--pickle-text-muted)]">Have a shortcode?</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input
                value={shortcode}
                onChange={(event) => setShortcode(event.target.value)}
                placeholder="Enter room shortcode"
                className="glass-input"
              />
              <GlassButton compact disabled={joinLoading} onClick={joinRoom}>
                {joinLoading ? 'Joining…' : 'Join Room'}
              </GlassButton>
            </div>
          </div>
        </GlassPanel>

        {error ? <div className="glass-alert">{error}</div> : null}
      </div>
    </AppShell>
  );
}
