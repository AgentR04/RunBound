import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Socket } from 'socket.io-client';
import { MOCK_USER } from '../types/game';
import { getSocket, joinAsUser } from '../services/socket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: number;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  onlineUsers: 0,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => {
      setIsConnected(true);
      // Announce who we are to the server
      joinAsUser(MOCK_USER.id);
    };

    const onDisconnect = () => setIsConnected(false);

    const onUsersOnline = (count: number) => setOnlineUsers(count);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('users:online', onUsersOnline);

    // If already connected when mounting
    if (s.connected) {
      setIsConnected(true);
      joinAsUser(MOCK_USER.id);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('users:online', onUsersOnline);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, onlineUsers }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
