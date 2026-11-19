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

// Desafíos preconfigurados para las 5 modalidades
const WORDS_FIX = [
  { word: "MOTION", letters: ["M", "O", "T", "I", "O", "N"] },
  { word: "DESIGN", letters: ["D", "E", "S", "I", "G", "N"] },
  { word: "TYPO", letters: ["T", "Y", "P", "O"] },
  { word: "BOLD", letters: ["B", "O", "L", "D"] },
  { word: "RUSH", letters: ["R", "U", "S", "H"] },
  { word: "POSTER", letters: ["P", "O", "S", "T", "E", "R"] },
  { word: "KINETIC", letters: ["K", "I", "N", "E", "T", "I", "C"] }
];

const STRETCH_TARGETS = [
  { text: "STRETCH", targetScaleX: 2.7, targetScaleY: 0.65, tolerance: 0.25, hint: "Estira horizontalmente separando tus manos" },
  { text: "CONDENSED", targetScaleX: 0.55, targetScaleY: 2.3, tolerance: 0.25, hint: "Comprime y alarga verticalmente" },
  { text: "EXPAND", targetScaleX: 3.1, targetScaleY: 0.5, tolerance: 0.25, hint: "Apertura máxima horizontal" },
  { text: "TALL", targetScaleX: 0.6, targetScaleY: 2.5, tolerance: 0.25, hint: "Alarga hacia arriba y abajo" }
];

const KERNING_WORDS = [
  { word: "AVALON", hint: "Ajusta la separación uniforme entre las letras" },
  { word: "TYPO", hint: "Equilibra el espacio entre T, Y, P, O" },
  { word: "WAR", hint: "Alinea el kerning diagonal de W, A, R" },
  { word: "MOTION", hint: "Distribuye armónicamente cada caracter" },
  { word: "DESIGN", hint: "Consigue la misma cadencia entre letras" }
];

const MODES_LIST = [
  { id: 0, key: "fix_the_type", name: "FIX THE TYPE", icon: "🧩", desc: "Reorganiza letras 3D para formar la palabra correcta" },
  { id: 1, key: "stretch_it", name: "STRETCH IT", icon: "↔️", desc: "Estira y deforma palabras para igualar la silueta" },
  { id: 2, key: "poster_rush", name: "POSTER RUSH", icon: "🎨", desc: "Crea tu cartel editorial combinando letras y figuras" },
  { id: 3, key: "kerning_race", name: "KERNING RACE", icon: "📐", desc: "Ajusta con precisión el espaciado entre letras" },
  { id: 4, key: "type_pop", name: "TYPE POP", icon: "💥", desc: "Toca y revienta las letras flotantes objetivo a gran velocidad" }
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
    selectedModeKey: room.selectedModeKey || 'all',
    totalRounds: room.playlist.length,
    currentRoundNumber: room.currentPlaylistIndex + 1,
    hostId: room.hostId,
    availableModes: MODES_LIST,
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

function setupRoundByModeIndex(room, modeIdx) {
  room.roundIndex = modeIdx;

  for (const player of room.players.values()) {
    player.roundScore = 0;
    player.progress = 0;
    player.hasFinished = false;
  }

  room.state = 'PLAYING_ROUND';

  if (modeIdx === 0) {
    // 1. FIX THE TYPE
    room.roundName = 'FIX THE TYPE';
    const challenge = WORDS_FIX[Math.floor(Math.random() * WORDS_FIX.length)];
    const shuffled = [...challenge.letters].sort(() => Math.random() - 0.5);
    room.currentChallenge = {
      mode: 'fix_the_type',
      word: challenge.word,
      shuffledLetters: shuffled
    };
    room.roundTimeRemaining = 45;
  } else if (modeIdx === 1) {
    // 2. STRETCH IT
    room.roundName = 'STRETCH IT';
    const target = STRETCH_TARGETS[Math.floor(Math.random() * STRETCH_TARGETS.length)];
    room.currentChallenge = {
      mode: 'stretch_it',
      ...target
    };
    room.roundTimeRemaining = 40;
  } else if (modeIdx === 2) {
    // 3. POSTER RUSH
    room.roundName = 'POSTER RUSH';
    room.currentChallenge = {
      mode: 'poster_rush',
      theme: "EDITORIAL POP CONTEMPORÁNEO",
      subtitle: "Compón con letras y formas 3D cálidas"
    };
    room.roundTimeRemaining = 55;
  } else if (modeIdx === 3) {
    // 4. KERNING RACE
    room.roundName = 'KERNING RACE';
    const kItem = KERNING_WORDS[Math.floor(Math.random() * KERNING_WORDS.length)];
    room.currentChallenge = {
      mode: 'kerning_race',
      word: kItem.word,
      hint: kItem.hint
    };
    room.roundTimeRemaining = 45;
  } else if (modeIdx === 4) {
    // 5. TYPE POP
    room.roundName = 'TYPE POP';
    room.currentChallenge = {
      mode: 'type_pop',
      hint: "Toca las letras objetivo antes de que escapen"
    };
    room.roundTimeRemaining = 40;
  }

  io.to(room.id).emit('round_started', getRoomPublicData(room));
  startRoundTimer(room);
}

function advanceNextRound(room) {
  room.currentPlaylistIndex++;
  if (room.currentPlaylistIndex < room.playlist.length) {
    const nextModeIdx = room.playlist[room.currentPlaylistIndex];
    setupRoundByModeIndex(room, nextModeIdx);
  } else {
    // Fin de partida
    room.state = 'GAME_OVER';
    io.to(room.id).emit('game_over', getRoomPublicData(room));
  }
}

function endCurrentRound(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  for (const player of room.players.values()) {
    player.score += player.roundScore;
  }

  const isFinalRound = (room.currentPlaylistIndex >= room.playlist.length - 1);

  if (!isFinalRound) {
    room.state = 'ROUND_RESULTS';
    io.to(room.id).emit('round_ended', getRoomPublicData(room));

    // Auto avance a la siguiente ronda tras 5.5 segundos
    setTimeout(() => {
      if (rooms.has(room.id)) {
        advanceNextRound(room);
      }
    }, 5500);
  } else {
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
      selectedModeKey: 'all', // 'all' (torneo 5 rondas) o '0'..'4'
      playlist: [0, 1, 2, 3, 4],
      currentPlaylistIndex: 0,
      players: new Map()
    };

    const player = {
      id: socket.id,
      name: playerName || 'Diseñador 1',
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
      socket.emit('error_message', { message: 'La sala no existe. Verifica el código de 5 caracteres.' });
      return;
    }

    if (room.state !== 'LOBBY' && room.state !== 'GAME_OVER') {
      socket.emit('error_message', { message: 'La partida ya comenzó. Espera a que termine.' });
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

  // Seleccionar modalidad antes de iniciar (solo host)
  socket.on('select_mode', ({ modeKey }) => {
    const room = rooms.get(socket.roomId);
    if (!room || room.hostId !== socket.id) return;

    room.selectedModeKey = modeKey;
    if (modeKey === 'all') {
      room.playlist = [0, 1, 2, 3, 4];
    } else {
      const parsed = parseInt(modeKey, 10);
      room.playlist = [parsed];
    }

    io.to(room.id).emit('mode_selected', {
      selectedModeKey: room.selectedModeKey,
      playlist: room.playlist
    });
  });

  // Iniciar partida (solo Host)
  socket.on('start_game', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Solo el anfitrión puede iniciar la partida.' });
      return;
    }

    // Reiniciar puntuaciones totales
    for (const player of room.players.values()) {
      player.score = 0;
      player.posterImage = null;
    }

    room.currentPlaylistIndex = 0;
    const firstModeIdx = room.playlist[0];
    setupRoundByModeIndex(room, firstModeIdx);
  });

  // Actualización de progreso en tiempo real
  socket.on('update_progress', ({ progress, roundScore }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.progress = Math.min(100, Math.max(0, progress));
    if (typeof roundScore === 'number') {
      player.roundScore = roundScore;
    }

    io.to(room.id).emit('leaderboard_update', {
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        roundScore: p.roundScore,
        progress: p.progress
      }))
    });

    // Reto completado al 100%
    if (player.progress >= 100 && !player.hasFinished) {
      player.hasFinished = true;
      const timeBonus = Math.floor(room.roundTimeRemaining * 15);
      player.roundScore += timeBonus;

      io.to(room.id).emit('player_completed', {
        playerId: player.id,
        playerName: player.name,
        roundScore: player.roundScore,
        timeBonus
      });

      const allFinished = Array.from(room.players.values()).every(p => p.hasFinished);
      if (allFinished) {
        endCurrentRound(room);
      }
    }
  });

  // Envío de póster en POSTER RUSH
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
    room.currentPlaylistIndex = 0;
    const firstModeIdx = room.playlist[0];
    setupRoundByModeIndex(room, firstModeIdx);
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
        if (room.hostId === socket.id) {
          const nextHost = room.players.keys().next().value;
          room.hostId = nextHost;
          console.log(`[SALA] Nuevo anfitrión asignado: ${nextHost}`);
        }
        io.to(room.id).emit('player_left', getRoomPublicData(room));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎮 TYPE IN MOTION (v2.0) - Servidor Activo en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
