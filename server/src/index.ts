import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { activitiesRouter } from './routes/activities';
import { territoriesRouter } from './routes/territories';
import { usersRouter } from './routes/users';
import { registerSocketHandlers } from './socket/handlers';

const PORT = 3001;

const app = express();
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/territories', territoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/activities', activitiesRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`RunBound server running on http://localhost:${PORT}`);
});
