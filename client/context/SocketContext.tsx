import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
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
  const { user } = useAuth();

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => {
      setIsConnected(true);
      if (user?.id) {
        joinAsUser(user.id);
      }
    };

    const onDisconnect = () => setIsConnected(false);
    const onUsersOnline = (count: number) => setOnlineUsers(count);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('users:online', onUsersOnline);

    if (s.connected && user?.id) {
      setIsConnected(true);
      joinAsUser(user.id);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('users:online', onUsersOnline);
    };
  }, [user?.id]);

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
