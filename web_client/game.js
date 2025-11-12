// NetPong 2025 - Web Client
// WebSocket game client with Canvas rendering and latency tracking

class NetPongClient {
    constructor() {
        // Device detection - ONCE at startup
        this.isMobile = this.detectMobile();
        this.isLowEnd = this.detectLowEndDevice();
        
        console.log('Device Info:', { 
            isMobile: this.isMobile, 
            isLowEnd: this.isLowEnd,
            userAgent: navigator.userAgent.substring(0, 50)
        });
        
        // WebSocket
        this.ws = null;
        this.serverUrl = window.NETPONG_CONFIG.WS_URL;
        this.playerId = null;
        this.roomCode = null;
        
        // Sound
        this.soundManager = new window.SoundManager();
        
        // Game state
        this.gameState = null;
        this.playerIndex = -1; // Which player are we (0 or 1)
        this.lastBallVelocity = { x: 0, y: 0 }; // Track ball velocity for collision sounds
        
    // Practice mode
    this.practiceMode = false;
    this.aiDifficulty = 0.7; // 0-1, higher is harder
    this.localGameState = null; // For practice mode
    this.lastMode = 'menu'; // 'menu' | 'practice' | 'multiplayer'

        // Swipe (trackpad-style) control state
        this.swipe = {
            active: false,
            speed: 1,        // multiplier 1..3
            lastY: 0,
            lastTime: 0
        };
        
        // Controls config
        this.controlMode = 'swipe'; // 'swipe' | 'drag'
        this.leftHanded = false;
        this.sensitivity = 3.0; // max speed multiplier
        
        // Rendering state
        this.lastRenderTime = 0;
        this.gameLoopId = null; // Track game loop animation frame
        
        // Canvas with hardware acceleration
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,  // Disable transparency for better performance
            desynchronized: true  // Reduce latency
        });
        
        // Optimize canvas for mobile
        this.setupCanvas();
        
        // Input
        this.keys = {};
        this.currentInput = 0; // -1, 0, or 1
        
        // Latency tracking
        this.pingInterval = null;
        this.latencySamples = [];
        
        // UI Elements
        this.screens = {
            menu: document.getElementById('menu-screen'),
            waiting: document.getElementById('waiting-screen'),
            game: document.getElementById('game-screen'),
            gameover: document.getElementById('gameover-screen'),
            leaderboard: document.getElementById('leaderboard-screen')
        };
        
        this.initUI();
        this.connect();
    }
    
    // ===== INITIALIZATION =====
    
    detectMobile() {
        // Multiple checks for mobile detection
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               ('ontouchstart' in window);
    }
    
    detectLowEndDevice() {
        // Check for low-end device indicators
        const cores = navigator.hardwareConcurrency || 4; // Default to 4 if unknown
        const memory = navigator.deviceMemory || 8; // Default to 8GB if unknown
        
        // Low-end if: less than 2 cores OR less than 2GB RAM OR mobile
        // Most modern desktops should NOT be considered low-end
        return cores < 2 || memory < 2 || this.isMobile;
    }
    
    setupCanvas() {
        // Set canvas size based on device
        if (this.isMobile) {
            // Scale down for mobile
            const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
            this.canvas.style.width = (800 * scale) + 'px';
            this.canvas.style.height = (600 * scale) + 'px';
        }
        
        // Enable hardware acceleration
        this.canvas.style.transform = 'translateZ(0)';
        this.canvas.style.backfaceVisibility = 'hidden';
        this.canvas.style.perspective = '1000px';
        
        // Image smoothing off for crisp pixels
        this.ctx.imageSmoothingEnabled = false;
    }
    
    initUI() {
        // Play intro sound on first interaction
        let introPlayed = false;
        const playIntroOnce = () => {
            if (!introPlayed) {
                this.soundManager.init();
                this.soundManager.playIntro();
                introPlayed = true;
            }
        };
        
        // Menu buttons with sounds
        document.getElementById('practice-mode-btn').addEventListener('click', () => {
            playIntroOnce();
            this.soundManager.playMenuClick();
            this.startPracticeMode();
        });
        document.getElementById('create-room-btn').addEventListener('click', () => {
            playIntroOnce();
            this.soundManager.playMenuClick();
            this.createRoom();
        });
        document.getElementById('join-room-btn').addEventListener('click', () => {
            playIntroOnce();
            this.soundManager.playMenuClick();
            this.showJoinInput();
        });
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            playIntroOnce();
            this.soundManager.playMenuClick();
            this.showLeaderboard();
        });

        // Exit Practice button (appears only in Practice Mode)
        const exitBtn = document.getElementById('exit-practice-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                this.soundManager.playMenuClick();
                this.exitPracticeMode();
            });
        }
        
        // Join room input with sounds
        document.getElementById('join-room-submit').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.joinRoom();
        });
        document.getElementById('join-room-cancel').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.hideJoinInput();
        });
        
        // Room code input - auto uppercase
        const roomCodeInput = document.getElementById('room-code-input');
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
        
        // Waiting screen with sound
        document.getElementById('cancel-waiting-btn').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.cancelWaiting();
        });
        
        // Game over screen with sounds
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.playAgain();
        });
        document.getElementById('main-menu-btn').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.showScreen('menu');
        });
        
        // Leaderboard with sound
        document.getElementById('leaderboard-back-btn').addEventListener('click', () => {
            this.soundManager.playMenuClick();
            this.showScreen('menu');
        });
        
        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());
        
        // Add hover sounds to all buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (this.soundManager.initialized) {
                    this.soundManager.playMenuHover();
                }
            });
        });
        
        // Keyboard input
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mobile touch controls
        this.setupMobileControls();
        
        // Initialize sound on first user interaction
        document.addEventListener('click', () => {
            if (!this.soundManager.initialized) {
                this.soundManager.init();
            }
        }, { once: true });
    }
    
    toggleSound() {
        const enabled = this.soundManager.toggle();
        const btn = document.getElementById('sound-toggle');
        btn.textContent = enabled ? '🔊' : '🔇';
        btn.classList.toggle('muted', !enabled);
    }
    
    setupMobileControls() {
        const upBtn = document.getElementById('mobile-up');
        const downBtn = document.getElementById('mobile-down');
        const mobileControls = document.getElementById('mobile-controls');
        const controlsText = document.getElementById('controls-text');

        // Show mobile controls if mobile device
        if (this.isMobile) {
            mobileControls.style.display = 'flex';
            controlsText.textContent = 'CONTROLS: Swipe up/down or use buttons';
        } else {
            mobileControls.style.display = 'none';
            controlsText.textContent = 'CONTROLS: Arrow keys ↑ ↓ to move';
        }

        // Touch events for UP button - with better mobile handling
        upBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.keys['ArrowUp'] = true;
            this.updateInput();
        }, { passive: false });

        upBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.keys['ArrowUp'] = false;
            this.updateInput();
        }, { passive: false });

        upBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.keys['ArrowUp'] = false;
            this.updateInput();
        }, { passive: false });

        // Touch events for DOWN button
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.keys['ArrowDown'] = true;
            this.updateInput();
        }, { passive: false });

        downBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.keys['ArrowDown'] = false;
            this.updateInput();
        }, { passive: false });

        downBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.keys['ArrowDown'] = false;
            this.updateInput();
        }, { passive: false });

        // Also support mouse events for testing on desktop
        upBtn.addEventListener('mousedown', () => {
            this.keys['ArrowUp'] = true;
            this.updateInput();
        });

        upBtn.addEventListener('mouseup', () => {
            this.keys['ArrowUp'] = false;
            this.updateInput();
        });

        downBtn.addEventListener('mousedown', () => {
            this.keys['ArrowDown'] = true;
            this.updateInput();
        });

        downBtn.addEventListener('mouseup', () => {
            this.keys['ArrowDown'] = false;
            this.updateInput();
        });

        // --- Swipe Velocity Control on Canvas (option #4) ---
        const canvas = this.canvas;
        const getTouch = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        const DEADZONE = 0.15;     // px/ms threshold for direction
        const SCALE = 2.5;         // velocity to speed multiplier mapping
        const MAX_SPEED = () => this.sensitivity; // cap multiplier based on settings

        const inControlHalf = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const startX = this.leftHanded ? rect.left : rect.left + rect.width / 2;
            const endX = this.leftHanded ? rect.left + rect.width / 2 : rect.right;
            return clientX >= startX && clientX <= endX;
        };

        const sendDirectionIfNeeded = (dir) => {
            if (dir !== this.currentInput) {
                this.currentInput = dir;
                if (!this.practiceMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.send({ type: 'paddle_input', direction: dir });
                }
            }
        };

        canvas.addEventListener('touchstart', (e) => {
            if (!this.isMobile || this.controlMode !== 'swipe') return;
            const t = getTouch(e);
            if (!t) return;
            if (!inControlHalf(t.clientX)) return; // only use control half
            e.preventDefault();
            this.swipe.active = true;
            this.swipe.lastY = t.clientY;
            this.swipe.lastTime = e.timeStamp;
            this.swipe.speed = 1;
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.swipe.active || this.controlMode !== 'swipe') return;
            const t = getTouch(e);
            if (!t) return;
            e.preventDefault();
            const dy = t.clientY - this.swipe.lastY; // +down, -up
            const dt = Math.max(1, e.timeStamp - this.swipe.lastTime);
            const vel = dy / dt; // px per ms

            // Direction with deadzone
            let dir = 0;
            if (Math.abs(vel) > DEADZONE) {
                dir = vel > 0 ? 1 : -1; // down or up
            }
            sendDirectionIfNeeded(dir);

            // Speed multiplier based on swipe velocity
            const mag = Math.max(0, Math.abs(vel) - DEADZONE);
            const speed = Math.min(1 + mag * SCALE, MAX_SPEED());
            this.swipe.speed = isFinite(speed) ? speed : 1;

            this.swipe.lastY = t.clientY;
            this.swipe.lastTime = e.timeStamp;
        }, { passive: false });

        const endSwipe = (e) => {
            if (!this.swipe.active) return;
            e.preventDefault();
            this.swipe.active = false;
            this.swipe.speed = 1;
            sendDirectionIfNeeded(0);
        };
        canvas.addEventListener('touchend', endSwipe, { passive: false });
        canvas.addEventListener('touchcancel', endSwipe, { passive: false });

        // --- Drag-to-Follow (optional mode) ---
        let dragActive = false;
        canvas.addEventListener('touchstart', (e) => {
            if (this.controlMode !== 'drag') return;
            const t = (e.touches && e.touches[0]);
            if (!t) return;
            if (!inControlHalf(t.clientX)) return;
            dragActive = true;
            this.currentInput = 0; // direct positioning — no direction spam
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!dragActive || this.controlMode !== 'drag') return;
            const t = (e.touches && e.touches[0]);
            if (!t) return;
            const rect = canvas.getBoundingClientRect();
            // map clientY to canvas coordinate
            const y = ((t.clientY - rect.top) / rect.height) * canvas.height;
            // In practice, set paddle directly; in multiplayer, convert to direction pulses
            if (this.practiceMode && this.localGameState) {
                const p = this.localGameState.players[0];
                p.y = Math.max(50, Math.min(600 - 50, y));
                p.paddle_y = p.y;
            } else {
                // infer direction relative to current paddle for server
                const approx = this.gameState && this.gameState.players ? this.gameState.players[this.playerIndex]?.paddle_y : null;
                const dir = approx && Math.abs(y - approx) > 5 ? (y > approx ? 1 : -1) : 0;
                if (dir !== this.currentInput) {
                    this.currentInput = dir;
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.send({ type: 'paddle_input', direction: dir });
                    }
                }
            }
            e.preventDefault();
        }, { passive: false });

        const endDrag = () => { dragActive = false; if (!this.practiceMode) this.currentInput = 0; };
        canvas.addEventListener('touchend', endDrag, { passive: false });
        canvas.addEventListener('touchcancel', endDrag, { passive: false });
    }
    
    connect() {
        this.updateConnectionStatus('Connecting...', false);
        
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateConnectionStatus('ONLINE', true);
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('ERROR', false);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('OFFLINE', false);
            
            // Attempt reconnect after 3 seconds
            setTimeout(() => this.connect(), 3000);
        };
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    handleMessage(data) {
        console.log('Received:', data.type);
        
        switch (data.type) {
            case 'connected':
                this.playerId = data.player_id;
                break;
            
            case 'room_created':
                this.roomCode = data.room_code;
                document.getElementById('room-code').textContent = this.roomCode;
                this.showScreen('waiting');
                break;
            
            case 'room_joined':
                this.roomCode = data.room_code;
                this.showScreen('game');
                this.startPingInterval();
                this.startGameLoop(); // Start continuous rendering
                break;
            
        
        // --- Drag-to-Follow (optional mode) ---
        let dragActive = false;
        canvas.addEventListener('touchstart', (e) => {
            if (this.controlMode !== 'drag') return;
            const t = (e.touches && e.touches[0]);
            if (!t) return;
            if (!inRightHalf(t.clientX)) return;
            dragActive = true;
            this.currentInput = 0; // direct positioning — no direction spam
            e.preventDefault();
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!dragActive || this.controlMode !== 'drag') return;
            const t = (e.touches && e.touches[0]);
            if (!t) return;
            const rect = canvas.getBoundingClientRect();
            // map clientY to canvas coordinate
            const y = ((t.clientY - rect.top) / rect.height) * canvas.height;
            // In practice, set paddle directly; in multiplayer, convert to direction pulses
            if (this.practiceMode && this.localGameState) {
                const p = this.localGameState.players[0];
                p.y = Math.max(50, Math.min(600 - 50, y));
                p.paddle_y = p.y;
            } else {
                // infer direction relative to current paddle for server
                const approx = this.gameState && this.gameState.players ? this.gameState.players[this.playerIndex]?.paddle_y : null;
                const dir = approx && Math.abs(y - approx) > 5 ? (y > approx ? 1 : -1) : 0;
                if (dir !== this.currentInput) {
                    this.currentInput = dir;
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.send({ type: 'paddle_input', direction: dir });
                    }
                }
            }
            e.preventDefault();
        }, { passive: false });
        
        const endDrag = () => { dragActive = false; if (!this.practiceMode) this.currentInput = 0; };
        canvas.addEventListener('touchend', endDrag, { passive: false });
        canvas.addEventListener('touchcancel', endDrag, { passive: false });
            case 'player_joined':
                // Second player joined, start game
                this.showScreen('game');
                this.startPingInterval();
                this.startGameLoop(); // Start continuous rendering
                break;
            
            case 'game_state':
                this.updateGameState(data);
                break;
            
            case 'pong':
                this.handlePong(data);
                break;
            
            case 'score_event':
                this.soundManager.playScore();
                break;
            
            case 'game_over':
                this.handleGameOver(data);
                this.soundManager.playVictory();
                break;
            
            case 'player_disconnected':
                this.handlePlayerDisconnect();
                break;
            
            case 'error':
                alert(data.message);
                break;
        }
    }
    
    // ===== ROOM MANAGEMENT =====
    
    createRoom() {
        const playerName = document.getElementById('player-name').value.trim() || 'Player';
        
        this.send({
            type: 'create_room',
            player_name: playerName
        });
    }
    
    showJoinInput() {
        document.getElementById('join-room-input').classList.remove('hidden');
    }
    
    hideJoinInput() {
        document.getElementById('join-room-input').classList.add('hidden');
        document.getElementById('room-code-input').value = '';
    }
    
    joinRoom() {
        const playerName = document.getElementById('player-name').value.trim() || 'Player';
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        
        if (roomCode.length !== 4) {
            alert('Please enter a 4-character room code');
            return;
        }
        
        this.send({
            type: 'join_room',
            room_code: roomCode,
            player_name: playerName
        });
        
        this.hideJoinInput();
    }
    
    cancelWaiting() {
        this.send({ type: 'disconnect' });
        this.showScreen('menu');
    }
    
    // ===== GAME LOGIC =====
    
    updateGameState(data) {
        // Validate data
        if (!data) {
            console.warn('❌ No game state data received');
            return;
        }
        
        // Log only occasionally to avoid console spam
        if (!this.updateCount) this.updateCount = 0;
        this.updateCount++;
        if (this.updateCount % 60 === 0) {
            console.log('📦 Game state update #' + this.updateCount + ':', {
                ball: data.ball ? `(${Math.round(data.ball.x)}, ${Math.round(data.ball.y)})` : 'none',
                players: data.players ? data.players.length : 0
            });
        }
        
        // Detect collisions by velocity changes (optimized)
        if (this.gameState && data.ball && this.soundManager.enabled) {
            const oldVelX = this.lastBallVelocity.x;
            const oldVelY = this.lastBallVelocity.y;
            // Server sends vx, vy not velocity.x, velocity.y
            const newVelX = data.ball.vx || (data.ball.velocity && data.ball.velocity.x) || 0;
            const newVelY = data.ball.vy || (data.ball.velocity && data.ball.velocity.y) || 0;
            
            // Only check if velocity actually changed (avoid unnecessary comparisons)
            if (oldVelX !== newVelX || oldVelY !== newVelY) {
                // Paddle hit (X velocity changed)
                if (Math.sign(oldVelX) !== Math.sign(newVelX) && oldVelX !== 0) {
                    this.soundManager.playPaddleHit();
                }
                // Wall hit (Y velocity changed)
                else if (Math.sign(oldVelY) !== Math.sign(newVelY) && oldVelY !== 0) {
                    this.soundManager.playWallHit();
                }
            }
            
            this.lastBallVelocity = { x: newVelX, y: newVelY };
        }
        
        this.gameState = data;
        
        // Determine our player index
        if (this.playerIndex === -1 && data.players.length > 0) {
            this.playerIndex = data.players.findIndex(p => p.id === this.playerId);
        }
        
        // Update HUD
        this.updateHUD(data);
        
        // Game loop will handle rendering continuously
        // No need to call render here anymore
    }
    
    updateHUD(data) {
        if (data.players.length >= 2) {
            // Player names and scores
            document.getElementById('player1-name').textContent = data.players[0].name;
            document.getElementById('player1-score').textContent = data.players[0].score;
            
            document.getElementById('player2-name').textContent = data.players[1].name;
            document.getElementById('player2-score').textContent = data.players[1].score;
            
            // Latency indicators
            this.updateLatencyIndicator('player1', data.players[0].latency_ms);
            this.updateLatencyIndicator('player2', data.players[1].latency_ms);
        }
    }
    
    updateLatencyIndicator(playerId, latencyMs) {
        const pingEl = document.getElementById(`${playerId}-ping`);
        const barEl = document.getElementById(`${playerId}-latency-bar`);
        
        pingEl.textContent = `${Math.round(latencyMs)}ms`;
        
        // Color based on latency
        let color, width;
        if (latencyMs < 50) {
            color = '#39ff14'; // Green
            width = 25;
        } else if (latencyMs < 100) {
            color = '#ffff00'; // Yellow
            width = 50;
        } else if (latencyMs < 200) {
            color = '#ffa500'; // Orange
            width = 75;
        } else {
            color = '#ff0000'; // Red
            width = 100;
        }
        
        barEl.style.setProperty('--latency-width', `${width}%`);
        barEl.style.setProperty('--latency-color', color);
    }
    
    drawEnhancedBall(ctx, x, y, radius) {
        // Ball trail effect (only on high-end devices)
        if (!this.isLowEnd) {
            // Draw trail particles
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
                const trailRadius = radius * (1 - i * 0.2);
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, trailRadius * 2);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(0, 243, 255, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, trailRadius * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        // Main ball with gradient
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, '#f0f0f0');
        gradient.addColorStop(0.8, '#00f3ff');
        gradient.addColorStop(1, '#00b8d4');
        
        ctx.fillStyle = gradient;
        
        // Outer glow
        if (!this.isLowEnd) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00f3ff';
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        if (!this.isLowEnd) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulse ring effect
            const pulseRadius = radius + Math.sin(Date.now() / 200) * 2;
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    render(data) {
        if (!data || !data.players || data.players.length < 2) {
            return; // Don't render if no valid data
        }
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // NO THROTTLING - render every frame to ensure smooth animation
        this.lastRenderTime = performance.now();
        
        // Clear canvas efficiently
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw center line (simpler on low-end)
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        if (data.players.length >= 2) {
            // Draw paddles - NO shadows on low-end devices
            const paddleWidth = 20;
            const paddleHeight = 100;
            const paddleOffset = 30;
            
            // Reset shadow for high-end devices
            if (!this.isLowEnd) {
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0; // Disable shadows completely on low-end
            }
            
            // Left paddle with gradient
            const leftGradient = ctx.createLinearGradient(
                paddleOffset, data.players[0].paddle_y - paddleHeight / 2,
                paddleOffset, data.players[0].paddle_y + paddleHeight / 2
            );
            leftGradient.addColorStop(0, '#00f3ff');
            leftGradient.addColorStop(0.5, '#00d4ff');
            leftGradient.addColorStop(1, '#00a0c8');
            ctx.fillStyle = leftGradient;
            
            if (!this.isLowEnd) {
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 15;
            }
            
            ctx.fillRect(
                paddleOffset,
                data.players[0].paddle_y - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );
            
            // Right paddle with gradient
            const rightGradient = ctx.createLinearGradient(
                canvas.width - paddleOffset - paddleWidth, data.players[1].paddle_y - paddleHeight / 2,
                canvas.width - paddleOffset - paddleWidth, data.players[1].paddle_y + paddleHeight / 2
            );
            rightGradient.addColorStop(0, '#ff00ff');
            rightGradient.addColorStop(0.5, '#ff00d4');
            rightGradient.addColorStop(1, '#c800a0');
            ctx.fillStyle = rightGradient;
            
            if (!this.isLowEnd) {
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 15;
            }
            
            ctx.fillRect(
                canvas.width - paddleOffset - paddleWidth,
                data.players[1].paddle_y - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );
            
            // Draw ball with enhanced effects
            this.drawEnhancedBall(ctx, data.ball.x, data.ball.y, 10);
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
    }
    
    // ===== INPUT =====
    
    handleKeyDown(e) {
        this.keys[e.key] = true;
        this.updateInput();
    }
    
    handleKeyUp(e) {
        this.keys[e.key] = false;
        this.updateInput();
    }
    
    updateInput() {
        let newInput = 0;
        
        // Support both arrow keys and WASD
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            newInput = -1;
        } else if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            newInput = 1;
        }
        
        // Update current input
        if (newInput !== this.currentInput) {
            this.currentInput = newInput;
            
            // Only send to server if not in practice mode
            if (!this.practiceMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'paddle_input',
                    direction: newInput
                });
            }
        }
    }
    
    // ===== LATENCY TRACKING =====
    
    startPingInterval() {
        // Send ping every second
        this.pingInterval = setInterval(() => {
            this.send({
                type: 'ping',
                timestamp: Date.now()
            });
        }, 1000);
    }
    
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    // ===== GAME LOOP =====
    
    startGameLoop() {
        // Start continuous render loop
        if (this.gameLoopId) {
            console.log('⚠️ Game loop already running, ID:', this.gameLoopId);
            return; // Already running
        }
        
        console.log('🎮 Starting game loop... (Device:', this.isMobile ? 'Mobile' : 'Desktop', ', Low-end:', this.isLowEnd, ')');
        console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Initial game state:', this.gameState);
        
        let frameCount = 0;
        let lastFpsTime = performance.now();
        let renderCount = 0;
        let loopCallCount = 0;
        
        const loop = () => {
            loopCallCount++;
            frameCount++;
            
            // Debug: Log every frame for first 10 frames
            if (loopCallCount <= 10) {
                console.log(`🔄 Loop call #${loopCallCount}, game state:`, this.gameState ? 'EXISTS' : 'NULL');
            }
            
            // Render current game state if available (or local state for practice mode)
            const stateToRender = this.practiceMode ? this.localGameState : this.gameState;
            if (stateToRender) {
                try {
                    this.render(stateToRender);
                    renderCount++;
                } catch (error) {
                    console.error('❌ Render error:', error);
                }
                
                // FPS counter (every 60 frames)
                if (frameCount >= 60) {
                    const now = performance.now();
                    const fps = Math.round(60000 / (now - lastFpsTime));
                    // Use the currently rendered state (supports practice mode)
                    const ball = (stateToRender && stateToRender.ball)
                        ? `(${Math.round(stateToRender.ball.x)}, ${Math.round(stateToRender.ball.y)})`
                        : 'n/a';
                    console.log(`📊 Loop FPS: ${fps} | Renders: ${renderCount} | Ball: ${ball}`);
                    frameCount = 0;
                    renderCount = 0;
                    lastFpsTime = now;
                }
            } else {
                // Log if no game state
                if (frameCount % 60 === 0) {
                    console.warn('⚠️ Game loop running but no game state yet, frame:', frameCount);
                }
            }
            
            // Continue loop
            this.gameLoopId = requestAnimationFrame(loop);
        };
        
        this.gameLoopId = requestAnimationFrame(loop);
        console.log('✅ Game loop started with ID:', this.gameLoopId);
    }
    
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
            console.log('Game loop stopped');
        }
    }
    
    handlePong(data) {
        const now = Date.now();
        const latency = now - data.client_timestamp;
        
        this.latencySamples.push(latency);
        if (this.latencySamples.length > 20) {
            this.latencySamples.shift();
        }
        
        // Send latency update to server
        this.send({
            type: 'latency_update',
            latency_ms: latency
        });
    }
    
    // ===== GAME OVER =====
    
    handleGameOver(data) {
        this.stopPingInterval();
        this.stopGameLoop();
        
        const winnerText = document.getElementById('winner-text');
        winnerText.textContent = `${data.winner} WINS!`;
        winnerText.setAttribute('data-text', `${data.winner} WINS!`);
        
        if (this.gameState && this.gameState.players.length >= 2) {
            const scores = document.getElementById('final-scores');
            scores.innerHTML = `
                <p>${this.gameState.players[0].name}: ${this.gameState.players[0].score}</p>
                <p>${this.gameState.players[1].name}: ${this.gameState.players[1].score}</p>
            `;
        }
        
        this.showScreen('gameover');
    }
    
    handlePlayerDisconnect() {
        this.stopPingInterval();
        alert('Opponent disconnected');
        this.showScreen('menu');
    }
    
    playAgain() {
        if (this.lastMode === 'practice') {
            this.startPracticeMode();
        } else {
            this.showScreen('menu');
            // Could implement rematch logic here for multiplayer
        }
    }
    
    // ===== LEADERBOARD =====
    
    async showLeaderboard() {
        this.showScreen('leaderboard');
        
        const tableEl = document.getElementById('leaderboard-table');
        tableEl.innerHTML = '<div class="loading">Loading...</div>';
        
        try {
            const response = await fetch(`${window.NETPONG_CONFIG.API_URL}/leaderboard`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                let html = '';
                result.data.forEach((entry, index) => {
                    html += `
                        <div class="leaderboard-entry">
                            <span class="rank">#${index + 1}</span>
                            <div class="player-stats">
                                <div><strong>${entry.player_name}</strong></div>
                                <div class="stat">
                                    ${entry.total_wins}W - ${entry.total_matches - entry.total_wins}L 
                                    (${entry.win_rate}%)
                                </div>
                                <div class="stat">
                                    Total Score: ${entry.total_score} | 
                                    Avg Latency: ${entry.avg_latency_ms}ms
                                </div>
                            </div>
                        </div>
                    `;
                });
                tableEl.innerHTML = html;
            } else {
                tableEl.innerHTML = '<p style="text-align: center; padding: 2rem;">No matches played yet</p>';
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            tableEl.innerHTML = '<p style="text-align: center; padding: 2rem;">Error loading leaderboard</p>';
        }
    }
    
    // ===== UI HELPERS =====
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }
    
    updateConnectionStatus(text, connected) {
        const statusEl = document.getElementById('connection-status');
        statusEl.textContent = `● ${text}`;
        
        if (connected) {
            statusEl.classList.add('connected');
        } else {
            statusEl.classList.remove('connected');
        }
    }
    
    playScoreSound() {
        // Could add audio feedback here
        console.log('Score!');
    }
    
    // ===== PRACTICE MODE =====
    
    startPracticeMode() {
        const name = document.getElementById('player-name').value.trim() || 'Player';
        
        console.log('🎮 Starting Practice Mode...');
        
    this.practiceMode = true;
    this.lastMode = 'practice';
        this.playerIndex = 0; // Player is always left paddle
        this.lastPracticeTime = null; // Reset timing
        
        // Initialize local game state (match server format)
        this.localGameState = {
            state: 'playing',
            ball: {
                x: 400,
                y: 300,
                vx: 300,
                vy: 200,
                radius: 10
            },
            players: [
                {
                    player_id: 'local',
                    name: name,
                    paddle_y: 300,  // render() expects paddle_y, not y
                    y: 300,          // keep for game loop
                    score: 0
                },
                {
                    player_id: 'ai',
                    name: 'AI Opponent',
                    paddle_y: 300,  // render() expects paddle_y, not y
                    y: 300,          // keep for game loop
                    score: 0
                }
            ],
            countdown: null
        };
        
        console.log('✅ Practice mode state initialized:', this.localGameState);
        
        this.showScreen('game');
        this.updateConnectionStatus('PRACTICE MODE', true);
    // Show exit button for practice mode
    const exitBtn = document.getElementById('exit-practice-btn');
    if (exitBtn) exitBtn.style.display = 'inline-block';
        this.startGameLoop();
        
        // Start practice game loop with requestAnimationFrame
        requestAnimationFrame((timestamp) => this.practiceGameLoop(timestamp));
        
        console.log('✅ Practice game loop started');
    }
    
    practiceGameLoop(timestamp) {
        if (!this.practiceMode) return;
        
        // Ensure timestamp is valid
        if (!timestamp) timestamp = performance.now();
        
        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 600;
        const PADDLE_HEIGHT = 100;
        const PADDLE_SPEED = 8;
        const BALL_SPEED_INCREMENT = 1.02;
        const MAX_BALL_SPEED = 600;
        
        // Calculate delta time for smooth frame-rate independent physics
        if (!this.lastPracticeTime) {
            this.lastPracticeTime = timestamp;
            this.practiceFrameCount = 0;
        }
        const dt = Math.min((timestamp - this.lastPracticeTime) / 1000, 0.033); // Cap at ~30fps min
        this.lastPracticeTime = timestamp;
        this.practiceFrameCount++;
        
        const state = this.localGameState;
        
        // Debug log every 60 frames
        if (this.practiceFrameCount % 60 === 0) {
            console.log('🎮 Practice frame:', this.practiceFrameCount, 'Ball:', 
                Math.round(state.ball.x), Math.round(state.ball.y), 
                'Player:', Math.round(state.players[0].y), 
                'AI:', Math.round(state.players[1].y));
        }
        
        // Update player paddle
        const player = state.players[0];
        const speedMultiplier = (this.swipe && this.swipe.active) ? this.swipe.speed : 1;
        const effectiveSpeed = PADDLE_SPEED * speedMultiplier;
        if (this.currentInput !== 0) {
            player.y += this.currentInput * effectiveSpeed;
            player.y = Math.max(PADDLE_HEIGHT/2, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT/2, player.y));
        }
        player.paddle_y = player.y;  // Always sync for render (CRITICAL!)
        
        // AI opponent - follows ball with some delay
        const ai = state.players[1];
        const aiCenter = ai.y;
        const ballY = state.ball.y;
        const aiSpeed = PADDLE_SPEED * this.aiDifficulty;
        
        if (Math.abs(ballY - aiCenter) > 10) {
            if (ballY > aiCenter) {
                ai.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT/2, ai.y + aiSpeed);
            } else {
                ai.y = Math.max(PADDLE_HEIGHT/2, ai.y - aiSpeed);
            }
        }
        ai.paddle_y = ai.y;  // Always sync for render (CRITICAL!)
        
        // Update ball position (convert velocity from pixels/sec to pixels/frame)
        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        
        // Ball collision with top/bottom walls
        if (state.ball.y - state.ball.radius <= 0 || state.ball.y + state.ball.radius >= CANVAS_HEIGHT) {
            state.ball.vy *= -1;
            state.ball.y = Math.max(state.ball.radius, Math.min(CANVAS_HEIGHT - state.ball.radius, state.ball.y));
            this.soundManager.playWallHit();
        }
        
        // Ball collision with paddles
        const PADDLE_WIDTH = 20;
        const PADDLE_X_LEFT = 40;
        const PADDLE_X_RIGHT = CANVAS_WIDTH - 40;
        
        // Left paddle (player)
        if (state.ball.x - state.ball.radius <= PADDLE_X_LEFT + PADDLE_WIDTH/2) {
            if (Math.abs(state.ball.y - player.y) < PADDLE_HEIGHT/2 + state.ball.radius) {
                state.ball.vx = Math.abs(state.ball.vx) * BALL_SPEED_INCREMENT;
                state.ball.x = PADDLE_X_LEFT + PADDLE_WIDTH/2 + state.ball.radius;
                
                // Add spin based on paddle hit position
                const hitPos = (state.ball.y - player.y) / (PADDLE_HEIGHT/2);
                state.ball.vy += hitPos * 50;
                
                this.soundManager.playPaddleHit();
            }
        }
        
        // Right paddle (AI)
        if (state.ball.x + state.ball.radius >= PADDLE_X_RIGHT - PADDLE_WIDTH/2) {
            if (Math.abs(state.ball.y - ai.y) < PADDLE_HEIGHT/2 + state.ball.radius) {
                state.ball.vx = -Math.abs(state.ball.vx) * BALL_SPEED_INCREMENT;
                state.ball.x = PADDLE_X_RIGHT - PADDLE_WIDTH/2 - state.ball.radius;
                
                const hitPos = (state.ball.y - ai.y) / (PADDLE_HEIGHT/2);
                state.ball.vy += hitPos * 50;
                
                this.soundManager.playPaddleHit();
            }
        }
        
        // Cap ball speed
        const currentSpeed = Math.sqrt(state.ball.vx * state.ball.vx + state.ball.vy * state.ball.vy);
        if (currentSpeed > MAX_BALL_SPEED) {
            const scale = MAX_BALL_SPEED / currentSpeed;
            state.ball.vx *= scale;
            state.ball.vy *= scale;
        }
        
        // Score detection
        if (state.ball.x - state.ball.radius <= 0) {
            // AI scores
            ai.score++;
            this.soundManager.playScore();
            this.resetBall();
        } else if (state.ball.x + state.ball.radius >= CANVAS_WIDTH) {
            // Player scores
            player.score++;
            this.soundManager.playScore();
            this.resetBall();
        }
        
        // Check for game over
        if (player.score >= 5 || ai.score >= 5) {
            this.endPracticeMode();
            return;
        }
        
        // Continue loop with requestAnimationFrame for better performance
        if (this.practiceMode) {
            requestAnimationFrame((timestamp) => this.practiceGameLoop(timestamp));
        }
    }
    
    resetBall() {
        const state = this.localGameState;
        state.ball.x = 400;
        state.ball.y = 300;
        
        // Random direction
        const angle = (Math.random() - 0.5) * Math.PI/3;
        const direction = Math.random() < 0.5 ? 1 : -1;
        state.ball.vx = Math.cos(angle) * 300 * direction;
        state.ball.vy = Math.sin(angle) * 300;
    }
    
    endPracticeMode() {
        this.practiceMode = false;
        this.lastMode = 'practice';

        const player = this.localGameState.players[0];
        const ai = this.localGameState.players[1];
        const playerWon = player.score >= 5;

        // Update Game Over UI (reuse multiplayer screen)
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        if (winnerText) {
            const text = playerWon ? 'YOU WIN!' : 'AI WINS!';
            winnerText.textContent = text;
            winnerText.setAttribute('data-text', text);
        }
        if (finalScores) {
            finalScores.innerHTML = `
                <p>${player.name}: ${player.score}</p>
                <p>${ai.name}: ${ai.score}</p>
            `;
        }

        // Hide Practice Exit button if visible
        const exitBtn = document.getElementById('exit-practice-btn');
        if (exitBtn) exitBtn.style.display = 'none';

        this.showScreen('gameover');
        this.updateConnectionStatus('OFFLINE', false);
        this.soundManager.playVictory();
    }

    // Allow exiting practice mode back to the main menu at any time
    exitPracticeMode() {
        if (!this.practiceMode) {
            // Already not in practice; just go to menu
            this.showScreen('menu');
            this.updateConnectionStatus('OFFLINE', false);
            const exitBtn = document.getElementById('exit-practice-btn');
            if (exitBtn) exitBtn.style.display = 'none';
            return;
        }

        // Stop practice loop and rendering
        this.practiceMode = false;      // practiceGameLoop will early-return
        this.localGameState = null;     // clear local state
        this.stopGameLoop();            // stop render loop to save CPU

        // Hide button and return to menu
        const exitBtn = document.getElementById('exit-practice-btn');
        if (exitBtn) exitBtn.style.display = 'none';
        this.showScreen('menu');
        this.updateConnectionStatus('OFFLINE', false);
    }
}

// Initialize client when page loads
window.addEventListener('DOMContentLoaded', () => {
    new NetPongClient();
});
