import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

// Singleton socket instance shared across the app
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[socket] connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// Announce the current user to the server so it can track online presence
export function joinAsUser(userId: string): void {
  getSocket().emit('user:join', userId);
}

interface RunSocketPayload {
  userId: string;
  location: { latitude: number; longitude: number };
  ghostUntil?: number | null;
}

function shouldBroadcastRunUpdate(ghostUntil?: number | null): boolean {
  return !ghostUntil || ghostUntil <= Date.now();
}

export function emitRunStarted(payload: RunSocketPayload): void {
  if (!shouldBroadcastRunUpdate(payload.ghostUntil)) {
    return;
  }

  getSocket().emit('run:start', payload);
}

export function emitRunLocation(payload: RunSocketPayload): void {
  if (!shouldBroadcastRunUpdate(payload.ghostUntil)) {
    return;
  }

  getSocket().emit('run:location', payload);
}

export function emitRunEnded(data: { userId: string }): void {
  getSocket().emit('run:end', data);
}
