const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Estado de salas en memoria
const rooms = new Map();

// Desafíos preconfigurados para las rondas
const WORDS_FIX = [
  { word: "MOTION", letters: ["M", "O", "T", "I", "O", "N"] },
  { word: "DESIGN", letters: ["D", "E", "S", "I", "G", "N"] },
  { word: "TYPO", letters: ["T", "Y", "P", "O"] },
  { word: "BOLD", letters: ["B", "O", "L", "D"] },
  { word: "RUSH", letters: ["R", "U", "S", "H"] }
];

const STRETCH_TARGETS = [
  { text: "STRETCH", targetScaleX: 2.8, targetScaleY: 0.6, tolerance: 0.25, hint: "Estira horizontalmente" },
  { text: "CONDENSED", targetScaleX: 0.5, targetScaleY: 2.4, tolerance: 0.25, hint: "Comprime y alarga verticalmente" },
  { text: "EXPAND", targetScaleX: 3.2, targetScaleY: 0.45, tolerance: 0.25, hint: "Apertura máxima horizontal" }
];

function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

function getRoomPublicData(room) {
  return {
    id: room.id,
    state: room.state,
    roundIndex: room.roundIndex,
    roundName: room.roundName,
    roundTimeRemaining: room.roundTimeRemaining,
    currentChallenge: room.currentChallenge,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      roundScore: p.roundScore,
      progress: p.progress,
      isHost: p.id === room.hostId,
      posterImage: p.posterImage || null
    }))
  };
}

function startRoundTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timerInterval = setInterval(() => {
    room.roundTimeRemaining--;

    io.to(room.id).emit('timer_tick', {
      timeRemaining: room.roundTimeRemaining
    });

    if (room.roundTimeRemaining <= 0) {
      clearInterval(room.timerInterval);
      endCurrentRound(room);
    }
  }, 1000);
}

function setupRound(room, roundIndex) {
  room.roundIndex = roundIndex;
  // Reiniciar puntajes de ronda de jugadores
  for (const player of room.players.values()) {
    player.roundScore = 0;
    player.progress = 0;
    player.hasFinished = false;
  }

  if (roundIndex === 0) {
    room.state = 'PLAYING_ROUND';
    room.roundName = 'FIX THE TYPE';
    const challenge = WORDS_FIX[Math.floor(Math.random() * WORDS_FIX.length)];
    // Mezclar letras para los jugadores
    const shuffled = [...challenge.letters].sort(() => Math.random() - 0.5);
    room.currentChallenge = {
      word: challenge.word,
      shuffledLetters: shuffled
    };
    room.roundTimeRemaining = 45;
  } else if (roundIndex === 1) {
    room.state = 'PLAYING_ROUND';
    room.roundName = 'STRETCH IT';
    const target = STRETCH_TARGETS[Math.floor(Math.random() * STRETCH_TARGETS.length)];
    room.currentChallenge = target;
    room.roundTimeRemaining = 40;
  } else if (roundIndex === 2) {
    room.state = 'PLAYING_ROUND';
    room.roundName = 'POSTER RUSH';
    room.currentChallenge = {
      theme: "EDITORIAL BRUTALISM",
      subtitle: "Compón con letras y formas 3D"
    };
    room.roundTimeRemaining = 60;
  }

  io.to(room.id).emit('round_started', getRoomPublicData(room));
  startRoundTimer(room);
}

function endCurrentRound(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  // Acumular puntaje de ronda al puntaje total
  for (const player of room.players.values()) {
    player.score += player.roundScore;
  }

  if (room.roundIndex < 2) {
    room.state = 'ROUND_RESULTS';
    io.to(room.id).emit('round_ended', getRoomPublicData(room));

    // Auto avance a la siguiente ronda tras 6 segundos
    setTimeout(() => {
      if (rooms.has(room.id)) {
        setupRound(room, room.roundIndex + 1);
      }
    }, 6000);
  } else {
    // Fin de la partida
    room.state = 'GAME_OVER';
    io.to(room.id).emit('game_over', getRoomPublicData(room));
  }
}

io.on('connection', (socket) => {
  console.log(`[SOCKET] Conexión establecida: ${socket.id}`);

  // Crear sala
  socket.on('create_room', ({ playerName }) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const room = {
      id: roomId,
      hostId: socket.id,
      state: 'LOBBY',
      roundIndex: 0,
      roundName: 'LOBBY',
      roundTimeRemaining: 0,
      currentChallenge: null,
      timerInterval: null,
      players: new Map()
    };

    const player = {
      id: socket.id,
      name: playerName || 'Jugador 1',
      score: 0,
      roundScore: 0,
      progress: 0,
      hasFinished: false,
      posterImage: null
    };

    room.players.set(socket.id, player);
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room_created', getRoomPublicData(room));
    console.log(`[SALA] Creada sala ${roomId} por ${player.name}`);
  });

  // Unirse a sala existente
  socket.on('join_room', ({ roomId, playerName }) => {
    const cleanId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(cleanId);

    if (!room) {
      socket.emit('error_message', { message: 'La sala no existe. Verifica el código.' });
      return;
    }

    if (room.state !== 'LOBBY' && room.state !== 'GAME_OVER') {
      socket.emit('error_message', { message: 'La partida ya está en curso. Espera a que termine.' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName || `Jugador ${room.players.size + 1}`,
      score: 0,
      roundScore: 0,
      progress: 0,
      hasFinished: false,
      posterImage: null
    };

    room.players.set(socket.id, player);
    socket.join(cleanId);
    socket.roomId = cleanId;

    io.to(cleanId).emit('player_joined', getRoomPublicData(room));
    console.log(`[SALA] ${player.name} se unió a la sala ${cleanId}`);
  });

  // Iniciar partida (solo Host)
  socket.on('start_game', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Solo el anfitrión puede iniciar la partida.' });
      return;
    }

    // Reiniciar puntajes
    for (const player of room.players.values()) {
      player.score = 0;
      player.posterImage = null;
    }

    setupRound(room, 0);
  });

  // Progreso en tiempo real
  socket.on('update_progress', ({ progress, roundScore }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.progress = Math.min(100, Math.max(0, progress));
    if (typeof roundScore === 'number') {
      player.roundScore = roundScore;
    }

    // Emitir leaderboard actualizado a toda la sala
    io.to(room.id).emit('leaderboard_update', {
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        roundScore: p.roundScore,
        progress: p.progress
      }))
    });

    // Si completó el reto al 100% y no había terminado
    if (player.progress >= 100 && !player.hasFinished) {
      player.hasFinished = true;
      // Bonus por velocidad según tiempo restante
      const timeBonus = Math.floor(room.roundTimeRemaining * 15);
      player.roundScore += timeBonus;

      io.to(room.id).emit('player_completed', {
        playerId: player.id,
        playerName: player.name,
        roundScore: player.roundScore,
        timeBonus
      });

      // Verificar si todos los jugadores terminaron
      const allFinished = Array.from(room.players.values()).every(p => p.hasFinished);
      if (allFinished) {
        endCurrentRound(room);
      }
    }
  });

  // Guardar póster creado en POSTER RUSH
  socket.on('submit_poster', ({ posterImage, roundScore }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.posterImage = posterImage;
      player.roundScore = roundScore || 500;
      player.progress = 100;
      player.hasFinished = true;

      io.to(room.id).emit('poster_submitted', {
        playerId: player.id,
        playerName: player.name
      });

      const allFinished = Array.from(room.players.values()).every(p => p.hasFinished);
      if (allFinished) {
        endCurrentRound(room);
      }
    }
  });

  // Reiniciar a nueva partida
  socket.on('restart_game', () => {
    const room = rooms.get(socket.roomId);
    if (!room || room.hostId !== socket.id) return;
    setupRound(room, 0);
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      const player = room.players.get(socket.id);
      const playerName = player ? player.name : 'Un jugador';
      room.players.delete(socket.id);

      console.log(`[DESCONEXIÓN] ${playerName} salió de ${room.id}`);

      if (room.players.size === 0) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        rooms.delete(room.id);
        console.log(`[SALA] Sala ${room.id} cerrada por quedar vacía`);
      } else {
        // Si el host salió, ceder host al siguiente jugador
        if (room.hostId === socket.id) {
          const nextHost = room.players.keys().next().value;
          room.hostId = nextHost;
          console.log(`[SALA] Nuevo host asignado: ${nextHost}`);
        }
        io.to(room.id).emit('player_left', getRoomPublicData(room));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎮 TYPE IN MOTION - Servidor Activo en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
