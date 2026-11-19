/**
 * TYPE IN MOTION - Frontend Orchestrator
 * Coordina UI, WebSockets (Socket.io), HandTracker y GameEngine.
 */

import { gameEngine } from './game_engine.js';
import { FixTheTypeMode } from './modes/fix_the_type.js';
import { StretchItMode } from './modes/stretch_it.js';
import { PosterRushMode } from './modes/poster_rush.js';

class App {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.myPlayerId = null;
    this.isHost = false;

    // Elementos DOM
    this.screens = {
      home: document.getElementById('screen-home'),
      lobby: document.getElementById('screen-lobby'),
      game: document.getElementById('screen-game'),
      roundResults: document.getElementById('screen-round-results'),
      gameOver: document.getElementById('screen-game-over')
    };

    this.timerDisplay = document.getElementById('round-timer');
    this.roundNameDisplay = document.getElementById('current-round-title');
    this.roundHintDisplay = document.getElementById('current-round-hint');
    this.playerScoreDisplay = document.getElementById('my-score-display');
  }

  init() {
    // 1. Inicializar Socket.io
    this.socket = io();
    this.setupSocketEvents();

    // 2. Inicializar Motor 3D
    const canvasContainer = document.getElementById('three-container');
    if (canvasContainer) {
      gameEngine.init(canvasContainer);
    }

    // 3. Inicializar Hand Tracker
    const videoElem = document.getElementById('webcam-video');
    const canvasElem = document.getElementById('webcam-canvas');
    if (window.handTracker) {
      window.handTracker.init(videoElem, canvasElem, (primaryHand, twoHands) => {
        gameEngine.updateHand(primaryHand, twoHands);
      });
    }

    // 4. Vincular controles de interfaz
    this.setupUIEvents();
    console.log("[APP] TYPE IN MOTION cliente inicializado.");
  }

  showScreen(screenKey) {
    Object.keys(this.screens).forEach((key) => {
      const scr = this.screens[key];
      if (scr) scr.classList.remove('active');
    });
    if (this.screens[screenKey]) {
      this.screens[screenKey].classList.add('active');
    }
  }

  setupUIEvents() {
    // Iniciar audio en primera interacción del usuario
    window.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.init();
    }, { once: true });

    // Alternar Sonido
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.onclick = () => {
        if (window.soundEngine) {
          const enabled = window.soundEngine.toggle();
          soundBtn.textContent = enabled ? '🔊' : '🔇';
        }
      };
    }

    // Alternar Modo de Control (Cámara / Mouse)
    const modeBtn = document.getElementById('btn-toggle-control');
    if (modeBtn) {
      modeBtn.onclick = () => {
        if (window.handTracker) {
          if (window.handTracker.isCameraActive) {
            window.handTracker.enableMouseFallback();
            modeBtn.textContent = '🖱️ Modo Mouse';
          } else {
            // Intentar reactivar cámara
            location.reload();
          }
        }
      };
    }

    // Botón: Crear Sala
    const createBtn = document.getElementById('btn-create-room');
    if (createBtn) {
      createBtn.onclick = () => {
        const nameInput = document.getElementById('input-player-name');
        const playerName = nameInput ? nameInput.value.trim() : 'Jugador 1';
        this.socket.emit('create_room', { playerName });
      };
    }

    // Botón: Unirse con Código
    const joinBtn = document.getElementById('btn-join-room');
    if (joinBtn) {
      joinBtn.onclick = () => {
        const nameInput = document.getElementById('input-player-name');
        const codeInput = document.getElementById('input-room-code');
        const playerName = nameInput ? nameInput.value.trim() : 'Jugador';
        const roomId = codeInput ? codeInput.value.trim() : '';
        if (!roomId) {
          alert('Por favor ingresa el código de la sala.');
          return;
        }
        this.socket.emit('join_room', { roomId, playerName });
      };
    }

    // Botón: Iniciar Partida (Host)
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.onclick = () => {
        this.socket.emit('start_game');
      };
    }

    // Botón: Jugar de Nuevo
    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) {
      restartBtn.onclick = () => {
        this.socket.emit('restart_game');
      };
    }
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      this.myPlayerId = this.socket.id;
      console.log(`[SOCKET] Conectado con ID: ${this.myPlayerId}`);
    });

    // Sala creada
    this.socket.on('room_created', (room) => {
      this.currentRoom = room;
      this.isHost = true;
      this.updateLobbyUI(room);
      this.showScreen('lobby');
    });

    // Jugador se unió a sala
    this.socket.on('player_joined', (room) => {
      this.currentRoom = room;
      this.isHost = room.hostId === this.myPlayerId;
      this.updateLobbyUI(room);
      this.showScreen('lobby');
    });

    // Jugador abandonó la sala
    this.socket.on('player_left', (room) => {
      this.currentRoom = room;
      this.isHost = room.hostId === this.myPlayerId;
      this.updateLobbyUI(room);
    });

    // Inicio de Ronda
    this.socket.on('round_started', (room) => {
      this.currentRoom = room;
      this.showScreen('game');
      this.setupGameMode(room);
    });

    // Temporizador
    this.socket.on('timer_tick', ({ timeRemaining }) => {
      if (this.timerDisplay) {
        this.timerDisplay.textContent = `${timeRemaining}s`;
        if (timeRemaining <= 5 && window.soundEngine) {
          window.soundEngine.playTick(timeRemaining === 1);
        }
      }
    });

    // Actualización de Leaderboard
    this.socket.on('leaderboard_update', ({ players }) => {
      this.renderLiveLeaderboard(players);
    });

    // Fin de Ronda
    this.socket.on('round_ended', (room) => {
      this.currentRoom = room;
      this.showRoundResults(room);
    });

    // Fin de Partida / Podio
    this.socket.on('game_over', (room) => {
      this.currentRoom = room;
      this.showGameOver(room);
    });

    // Errores
    this.socket.on('error_message', ({ message }) => {
      alert(message);
    });
  }

  updateLobbyUI(room) {
    const codeElem = document.getElementById('lobby-room-code');
    if (codeElem) codeElem.textContent = room.id;

    const playersList = document.getElementById('lobby-players-list');
    if (playersList) {
      playersList.innerHTML = '';
      room.players.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'player-card-editorial';
        card.innerHTML = `
          <div class="player-avatar-badge">${p.name.charAt(0).toUpperCase()}</div>
          <div class="player-info">
            <span class="player-name">${p.name} ${p.isHost ? '★ (Anfitrión)' : ''}</span>
            <span class="player-status">Listo para jugar</span>
          </div>
        `;
        playersList.appendChild(card);
      });
    }

    const startBtn = document.getElementById('btn-start-game');
    const waitingMsg = document.getElementById('lobby-waiting-msg');
    if (startBtn && waitingMsg) {
      if (this.isHost) {
        startBtn.style.display = 'block';
        waitingMsg.style.display = 'none';
      } else {
        startBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
      }
    }
  }

  setupGameMode(room) {
    const idx = room.roundIndex;
    const challenge = room.currentChallenge;

    // Ocultar medidores específicos
    const stretchMeter = document.getElementById('stretch-accuracy-meter');
    if (stretchMeter) stretchMeter.style.display = 'none';

    if (idx === 0) {
      // FIX THE TYPE
      this.roundNameDisplay.textContent = 'RONDA 1: FIX THE TYPE';
      this.roundHintDisplay.textContent = `Ordena las letras para formar: "${challenge.word}"`;
      const mode = new FixTheTypeMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    } else if (idx === 1) {
      // STRETCH IT
      this.roundNameDisplay.textContent = 'RONDA 2: STRETCH IT';
      this.roundHintDisplay.textContent = challenge.hint || 'Estira o comprime la palabra para igualar la silueta';
      if (stretchMeter) stretchMeter.style.display = 'block';

      const mode = new StretchItMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    } else if (idx === 2) {
      // POSTER RUSH
      this.roundNameDisplay.textContent = 'RONDA 3: POSTER RUSH';
      this.roundHintDisplay.textContent = 'Crea tu cartel tipográfico editorial con letras y formas 3D';

      const mode = new PosterRushMode(
        challenge,
        (progress, score) => {
          this.socket.emit('update_progress', { progress, roundScore: score });
          if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
        },
        (posterSnapshot, finalScore) => {
          this.socket.emit('submit_poster', { posterImage: posterSnapshot, roundScore: finalScore });
        }
      );
      gameEngine.setMode(mode);
    }
  }

  renderLiveLeaderboard(players) {
    const container = document.getElementById('live-leaderboard-strip');
    if (!container) return;

    // Ordenar por puntaje descendente
    const sorted = [...players].sort((a, b) => (b.score + b.roundScore) - (a.score + a.roundScore));
    container.innerHTML = '';

    sorted.forEach((p, rank) => {
      const item = document.createElement('div');
      item.className = `leader-strip-item ${p.id === this.myPlayerId ? 'my-item' : ''}`;
      item.innerHTML = `
        <span class="rank-num">#${rank + 1}</span>
        <span class="player-strip-name">${p.name}</span>
        <span class="player-strip-score">${p.score + p.roundScore} pts</span>
        <div class="progress-mini-bar" style="width: ${p.progress}%"></div>
      `;
      container.appendChild(item);
    });
  }

  showRoundResults(room) {
    this.showScreen('roundResults');
    const title = document.getElementById('results-round-title');
    if (title) title.textContent = `RESULTADOS: ${room.roundName}`;

    const list = document.getElementById('results-leaderboard');
    if (list) {
      list.innerHTML = '';
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      sorted.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'results-row';
        row.innerHTML = `
          <span class="results-pos">${idx + 1}º</span>
          <span class="results-name">${p.name}</span>
          <span class="results-round-pts">+${p.roundScore} en ronda</span>
          <span class="results-total-pts">${p.score} TOTAL</span>
        `;
        list.appendChild(row);
      });
    }
  }

  showGameOver(room) {
    this.showScreen('gameOver');
    if (window.soundEngine) window.soundEngine.playSuccess();

    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    const winnerNameElem = document.getElementById('podium-winner-name');
    if (winnerNameElem && winner) {
      winnerNameElem.textContent = `${winner.name} (${winner.score} PTS)`;
    }

    // Podio 1, 2, 3
    const podiumCont = document.getElementById('podium-steps');
    if (podiumCont) {
      podiumCont.innerHTML = '';
      sorted.slice(0, 3).forEach((p, idx) => {
        const step = document.createElement('div');
        step.className = `podium-pillar step-${idx + 1}`;
        step.innerHTML = `
          <div class="podium-avatar">${p.name.charAt(0)}</div>
          <div class="podium-info">
            <span class="podium-rank">${idx + 1}º Lugar</span>
            <span class="podium-name">${p.name}</span>
            <span class="podium-pts">${p.score} PTS</span>
          </div>
        `;
        podiumCont.appendChild(step);
      });
    }

    // Exposición de Pósters creados en POSTER RUSH
    const gallery = document.getElementById('posters-gallery-grid');
    if (gallery) {
      gallery.innerHTML = '';
      room.players.forEach((p) => {
        if (p.posterImage) {
          const card = document.createElement('div');
          card.className = 'gallery-poster-card';
          card.innerHTML = `
            <img src="${p.posterImage}" alt="Póster de ${p.name}" class="gallery-poster-img" />
            <div class="gallery-poster-author">Autor: ${p.name}</div>
          `;
          gallery.appendChild(card);
        }
      });
    }

    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) {
      restartBtn.style.display = this.isHost ? 'inline-block' : 'none';
    }
  }
}

window.app = new App();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
