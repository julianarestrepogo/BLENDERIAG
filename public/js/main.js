/**
 * TYPE IN MOTION - Frontend Orchestrator (v2.0)
 * Coordina UI, WebSockets (Socket.io), HandTracker, GameEngine
 * y las 5 modalidades de juego con instrucciones visuales previas.
 */

import { gameEngine } from './game_engine.js';
import { FixTheTypeMode } from './modes/fix_the_type.js';
import { StretchItMode } from './modes/stretch_it.js';
import { PosterRushMode } from './modes/poster_rush.js';
import { KerningRaceMode } from './modes/kerning_race.js';
import { TypePopMode } from './modes/type_pop.js';

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
    this.socket = io();
    this.setupSocketEvents();

    const canvasContainer = document.getElementById('three-container');
    if (canvasContainer) {
      gameEngine.init(canvasContainer);
    }

    const videoElem = document.getElementById('webcam-video');
    const canvasElem = document.getElementById('webcam-canvas');
    if (window.handTracker) {
      window.handTracker.init(videoElem, canvasElem, (primaryHand, twoHands) => {
        gameEngine.updateHand(primaryHand, twoHands);
      });
    }

    this.setupUIEvents();
    console.log("[APP] TYPE IN MOTION v2.0 inicializado con 5 modalidades.");
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

    // Alternar Control (Cámara / Mouse)
    const modeBtn = document.getElementById('btn-toggle-control');
    if (modeBtn) {
      modeBtn.onclick = () => {
        if (window.handTracker) {
          if (window.handTracker.isCameraActive) {
            window.handTracker.enableMouseFallback();
            modeBtn.textContent = '🖱️ Modo Mouse';
          } else {
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
        const playerName = nameInput ? nameInput.value.trim() : 'Diseñador 1';
        this.socket.emit('create_room', { playerName });
      };
    }

    // Botón: Unirse con Código
    const joinBtn = document.getElementById('btn-join-room');
    if (joinBtn) {
      joinBtn.onclick = () => {
        const nameInput = document.getElementById('input-player-name');
        const codeInput = document.getElementById('input-room-code');
        const playerName = nameInput ? nameInput.value.trim() : 'Diseñador';
        const roomId = codeInput ? codeInput.value.trim() : '';
        if (!roomId) {
          alert('Por favor ingresa el código de 5 caracteres.');
          return;
        }
        this.socket.emit('join_room', { roomId, playerName });
      };
    }

    // Selector de Modo en Lobby
    const modeSelect = document.getElementById('lobby-mode-selector');
    if (modeSelect) {
      modeSelect.onchange = (e) => {
        if (this.isHost) {
          this.socket.emit('select_mode', { modeKey: e.target.value });
        }
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

    this.socket.on('room_created', (room) => {
      this.currentRoom = room;
      this.isHost = true;
      this.updateLobbyUI(room);
      this.showScreen('lobby');
    });

    this.socket.on('player_joined', (room) => {
      this.currentRoom = room;
      this.isHost = room.hostId === this.myPlayerId;
      this.updateLobbyUI(room);
      this.showScreen('lobby');
    });

    this.socket.on('player_left', (room) => {
      this.currentRoom = room;
      this.isHost = room.hostId === this.myPlayerId;
      this.updateLobbyUI(room);
    });

    this.socket.on('mode_selected', ({ selectedModeKey }) => {
      const modeSelect = document.getElementById('lobby-mode-selector');
      if (modeSelect) modeSelect.value = selectedModeKey;
    });

    // Inicio de Ronda con Pantalla de Instrucciones Breves Previas
    this.socket.on('round_started', (room) => {
      this.currentRoom = room;
      this.showRoundInstructions(room, () => {
        this.showScreen('game');
        this.setupGameMode(room);
      });
    });

    this.socket.on('timer_tick', ({ timeRemaining }) => {
      if (this.timerDisplay) {
        this.timerDisplay.textContent = `${timeRemaining}s`;
        if (timeRemaining <= 5 && window.soundEngine) {
          window.soundEngine.playTick(timeRemaining === 1);
        }
      }
    });

    this.socket.on('leaderboard_update', ({ players }) => {
      this.renderLiveLeaderboard(players);
    });

    this.socket.on('round_ended', (room) => {
      this.currentRoom = room;
      this.showRoundResults(room);
    });

    this.socket.on('game_over', (room) => {
      this.currentRoom = room;
      this.showGameOver(room);
    });

    this.socket.on('error_message', ({ message }) => {
      alert(message);
    });
  }

  updateLobbyUI(room) {
    const codeElem = document.getElementById('lobby-room-code');
    if (codeElem) codeElem.textContent = room.id;

    const modeSelect = document.getElementById('lobby-mode-selector');
    if (modeSelect) {
      modeSelect.value = room.selectedModeKey || 'all';
      modeSelect.disabled = !this.isHost;
    }

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
            <span class="player-status">Listo para competir</span>
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

  // Instrucciones visuales previas antes de cada reto
  showRoundInstructions(room, onStartCallback) {
    const modal = document.getElementById('round-intro-modal');
    if (!modal) {
      onStartCallback();
      return;
    }

    const titleElem = document.getElementById('intro-modal-title');
    const descElem = document.getElementById('intro-modal-desc');
    const gestureElem = document.getElementById('intro-modal-gesture');
    const iconElem = document.getElementById('intro-modal-icon');

    const idx = room.roundIndex;
    const instructions = [
      {
        title: "01. FIX THE TYPE",
        icon: "🧩",
        desc: "Las letras 3D están desordenadas en pantalla. Debes ordenarlas para formar la palabra antes de que termine el tiempo.",
        gesture: "🤏 PELLIZCO CON ÍNDICE Y PULGAR: Agarra cada letra y arrástrala a su casilla correspondiente."
      },
      {
        title: "02. STRETCH IT",
        icon: "↔️",
        desc: "Transforma la palabra estirándola o comprimiéndola para encajarla exactamente en la silueta de referencia.",
        gesture: "👐 DOS MANOS: Separa tus manos para estirar horizontalmente, o acércalas para comprimir la palabra."
      },
      {
        title: "03. POSTER RUSH",
        icon: "🎨",
        desc: "Diseña un cartel tipográfico 3D creativo. Selecciona letras y figuras de Blender para armar tu composición.",
        gesture: "🤏 AGARRA Y SUELTA: Coloca los elementos sobre el lienzo editorial y pulsa FINALIZAR al terminar."
      },
      {
        title: "04. KERNING RACE",
        icon: "📐",
        desc: "Ajusta con precisión milimétrica los espacios entre las letras para que coincidan con la palabra de referencia.",
        gesture: "↔️ PELLIZCA Y DESPLAZA: Toma cualquier letra y muévela horizontalmente para equilibrar el espaciado."
      },
      {
        title: "05. TYPE POP",
        icon: "💥",
        desc: "Múltiples letras flotan por la pantalla a gran velocidad. ¡Identifica y revienta la letra objetivo!",
        gesture: "👆 TOCA O PELLIZCA: Toca las letras correctas para ganar puntos (+200). ¡Cuidado con tocar las incorrectas!"
      }
    ];

    const currentInfo = instructions[idx] || instructions[0];
    if (titleElem) titleElem.textContent = currentInfo.title;
    if (iconElem) iconElem.textContent = currentInfo.icon;
    if (descElem) descElem.textContent = currentInfo.desc;
    if (gestureElem) gestureElem.textContent = currentInfo.gesture;

    modal.classList.add('active');

    let countdown = 3;
    const countBtn = document.getElementById('btn-intro-continue');
    if (countBtn) {
      countBtn.textContent = `¡EMPEZAR! (${countdown}s)`;
    }

    const interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
        modal.classList.remove('active');
        onStartCallback();
      } else if (countBtn) {
        countBtn.textContent = `¡EMPEZAR! (${countdown}s)`;
      }
    }, 1000);

    if (countBtn) {
      countBtn.onclick = () => {
        clearInterval(interval);
        modal.classList.remove('active');
        onStartCallback();
      };
    }
  }

  setupGameMode(room) {
    const idx = room.roundIndex;
    const challenge = room.currentChallenge;

    const stretchMeter = document.getElementById('stretch-accuracy-meter');
    if (stretchMeter) stretchMeter.style.display = 'none';

    const roundNum = room.currentRoundNumber || (idx + 1);
    const totalRounds = room.totalRounds || 5;

    if (idx === 0) {
      // FIX THE TYPE
      this.roundNameDisplay.textContent = `RONDA ${roundNum}/${totalRounds}: FIX THE TYPE`;
      this.roundHintDisplay.textContent = `Ordena las letras para formar: "${challenge.word}"`;
      const mode = new FixTheTypeMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    } else if (idx === 1) {
      // STRETCH IT
      this.roundNameDisplay.textContent = `RONDA ${roundNum}/${totalRounds}: STRETCH IT`;
      this.roundHintDisplay.textContent = challenge.hint || 'Estira o comprime la palabra para igualar la silueta';
      if (stretchMeter) stretchMeter.style.display = 'block';

      const mode = new StretchItMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    } else if (idx === 2) {
      // POSTER RUSH
      this.roundNameDisplay.textContent = `RONDA ${roundNum}/${totalRounds}: POSTER RUSH`;
      this.roundHintDisplay.textContent = 'Compón libremente tu cartel tipográfico con letras y figuras 3D';

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
    } else if (idx === 3) {
      // KERNING RACE
      this.roundNameDisplay.textContent = `RONDA ${roundNum}/${totalRounds}: KERNING RACE`;
      this.roundHintDisplay.textContent = `Ajusta el espaciado para igualar la palabra superior: "${challenge.word}"`;

      const mode = new KerningRaceMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    } else if (idx === 4) {
      // TYPE POP
      this.roundNameDisplay.textContent = `RONDA ${roundNum}/${totalRounds}: TYPE POP`;
      this.roundHintDisplay.textContent = '¡Toca y revienta las letras flotantes objetivo!';

      const mode = new TypePopMode(challenge, (progress, score) => {
        this.socket.emit('update_progress', { progress, roundScore: score });
        if (this.playerScoreDisplay) this.playerScoreDisplay.textContent = `${score} PTS`;
      });
      gameEngine.setMode(mode);
    }
  }

  renderLiveLeaderboard(players) {
    const container = document.getElementById('live-leaderboard-strip');
    if (!container) return;

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

    const gallery = document.getElementById('posters-gallery-grid');
    if (gallery) {
      gallery.innerHTML = '';
      room.players.forEach((p) => {
        if (p.posterImage) {
          const card = document.createElement('div');
          card.className = 'gallery-poster-card';
          card.innerHTML = `
            <img src="${p.posterImage}" alt="Póster de ${p.name}" class="gallery-poster-img" />
            <div class="gallery-poster-author">Diseñado por: ${p.name}</div>
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
