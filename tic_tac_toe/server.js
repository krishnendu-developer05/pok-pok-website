// Pok-Pok Tic Tac Toe Multiplayer Server
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// In production, serve the built React app from the client/dist folder
const PORT = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'client/dist')));

// Match any other routes and serve index.html for client-side routing (React SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory Room State Store
const rooms = new Map(); // roomId (6-char string) -> Room object

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

function checkWinner(board) {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const [a, b, c] = WIN_LINES[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: WIN_LINES[i] };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return null;
}

// Room garbage collection: destroy rooms with no active players that are older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const allDisconnected = room.players.every(p => !p.connected);
    const roomAge = now - room.createdAt;
    if (allDisconnected && roomAge > 1800000) { // 30 minutes of complete inactivity
      rooms.delete(roomId);
      console.log(`Deleted inactive room: ${roomId}`);
    }
  }
}, 300000); // Check every 5 minutes

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // 1. Create Room (Player 1)
  socket.on('createRoom', ({ name, email, phone }) => {
    try {
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      const newRoom = {
        id: roomId,
        createdAt: Date.now(),
        players: [
          {
            id: socket.id,
            name: name.trim().toUpperCase(),
            email: email.trim(),
            phone: phone.trim(),
            symbol: 'X',
            connected: true
          }
        ],
        board: Array(9).fill(null),
        turn: 'X',
        gameActive: true,
        winner: null,
        winLine: null,
        rematchRequests: [] // Socket IDs that clicked rematch
      };

      rooms.set(roomId, newRoom);
      socket.join(roomId);
      
      socket.emit('roomCreated', {
        roomId,
        symbol: 'X',
        roomState: newRoom
      });
      console.log(`Room created: ${roomId} by player ${name}`);
    } catch (e) {
      socket.emit('errorMsg', 'Failed to create room.');
    }
  });

  // 2. Join Room (Player 2)
  socket.on('joinRoom', ({ roomId, name }) => {
    try {
      const id = roomId.trim().toUpperCase();
      const room = rooms.get(id);

      if (!room) {
        socket.emit('errorMsg', 'Room not found.');
        return;
      }

      // Check if player is re-connecting (same name or same socket ID)
      const existingPlayerIndex = room.players.findIndex(p => p.name === name.trim().toUpperCase() || p.id === socket.id);

      if (existingPlayerIndex !== -1) {
        // Player reconnecting
        room.players[existingPlayerIndex].id = socket.id;
        room.players[existingPlayerIndex].connected = true;
        socket.join(id);
        
        socket.emit('roomJoined', {
          symbol: room.players[existingPlayerIndex].symbol,
          roomState: room
        });

        // Notify room about reconnect
        io.to(id).emit('roomStateUpdate', room);
        io.to(id).emit('statusMessage', `${room.players[existingPlayerIndex].name} reconnected.`);
        console.log(`Player ${name} reconnected to room ${id}`);
        return;
      }

      // If room is already full
      if (room.players.length >= 2) {
        socket.emit('errorMsg', 'Room is full.');
        return;
      }

      // Add Player 2 as 'O'
      const newPlayer = {
        id: socket.id,
        name: name.trim().toUpperCase(),
        email: '',
        phone: '',
        symbol: 'O',
        connected: true
      };

      room.players.push(newPlayer);
      socket.join(id);

      socket.emit('roomJoined', {
        symbol: 'O',
        roomState: room
      });

      // Broadcast update to both players
      io.to(id).emit('roomStateUpdate', room);
      io.to(id).emit('statusMessage', `${newPlayer.name} joined the game.`);
      console.log(`Player ${name} joined room ${id}`);
    } catch (e) {
      socket.emit('errorMsg', 'Failed to join room.');
    }
  });

  // 3. Make Move
  socket.on('makeMove', ({ roomId, cellIndex }) => {
    try {
      const id = roomId.trim().toUpperCase();
      const room = rooms.get(id);

      if (!room || !room.gameActive) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Validate turn
      if (room.turn !== player.symbol) {
        socket.emit('errorMsg', "It's not your turn.");
        return;
      }

      // Validate cell
      if (cellIndex < 0 || cellIndex > 8 || room.board[cellIndex] !== null) {
        socket.emit('errorMsg', "Invalid cell choice.");
        return;
      }

      // Execute move
      room.board[cellIndex] = player.symbol;

      // Check win/draw
      const result = checkWinner(room.board);
      if (result) {
        room.gameActive = false;
        room.winner = result.winner;
        room.winLine = result.line;
      } else {
        // Toggle turn
        room.turn = room.turn === 'X' ? 'O' : 'X';
      }

      io.to(id).emit('roomStateUpdate', room);
    } catch (e) {
      console.error(e);
    }
  });

  // 4. Request Rematch
  socket.on('requestRematch', ({ roomId }) => {
    try {
      const id = roomId.trim().toUpperCase();
      const room = rooms.get(id);

      if (!room) return;

      if (!room.rematchRequests.includes(socket.id)) {
        room.rematchRequests.push(socket.id);
      }

      // Broadcast rematch state
      io.to(id).emit('rematchState', {
        requestsCount: room.rematchRequests.length,
        rematchRequests: room.rematchRequests
      });

      // If both players agreed
      if (room.rematchRequests.length >= 2) {
        // Reset board
        room.board = Array(9).fill(null);
        room.gameActive = true;
        room.winner = null;
        room.winLine = null;
        room.rematchRequests = [];
        room.turn = 'X'; // Start with X again

        io.to(id).emit('roomStateUpdate', room);
        io.to(id).emit('statusMessage', 'Rematch started.');
      }
    } catch (e) {
      console.error(e);
    }
  });

  // 5. Leave Room / Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Find rooms where this socket was playing
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players[playerIndex].connected = false;
        
        // Remove from rematch request array if present
        room.rematchRequests = room.rematchRequests.filter(id => id !== socket.id);

        io.to(room.id).emit('roomStateUpdate', room);
        io.to(room.id).emit('opponentDisconnected', {
          symbol: room.players[playerIndex].symbol,
          name: room.players[playerIndex].name
        });
        
        console.log(`Player ${room.players[playerIndex].name} marked offline in room ${room.id}`);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Pok-Pok Tic Tac Toe multiplayer server running on port ${PORT}`);
});
