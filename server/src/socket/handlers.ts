import { Server, Socket } from 'socket.io';

// Track online user count per socket
const onlineUsers = new Set<string>();

export function registerSocketHandlers(io: Server, socket: Socket): void {
  // Client announces their userId on connect
  socket.on('user:join', (userId: string) => {
    socket.data.userId = userId;
    onlineUsers.add(userId);
    socket.join(`user:${userId}`);
    io.emit('users:online', onlineUsers.size);
    console.log(`[socket] ${userId} joined — ${onlineUsers.size} online`);
  });

  // Client starts an active run — broadcast their position to nearby viewers
  socket.on('run:start', (data: { userId: string; location: { latitude: number; longitude: number } }) => {
    socket.broadcast.emit('run:active', {
      userId: data.userId,
      location: data.location,
      socketId: socket.id,
    });
  });

  // Client updates location mid-run (throttle on the client to every ~5s)
  socket.on('run:location', (data: { userId: string; location: { latitude: number; longitude: number } }) => {
    socket.broadcast.emit('run:location', {
      userId: data.userId,
      location: data.location,
    });
  });

  // Client ends their run
  socket.on('run:end', (data: { userId: string }) => {
    socket.broadcast.emit('run:ended', { userId: data.userId });
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      onlineUsers.delete(userId);
      io.emit('users:online', onlineUsers.size);
      socket.broadcast.emit('run:ended', { userId });
    }
  });
}
