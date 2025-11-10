// NetPong 2025 - Web Client
// WebSocket game client with Canvas rendering and latency tracking

class NetPongClient {
    constructor() {
        // WebSocket
        this.ws = null;
        this.serverUrl = window.NETPONG_CONFIG.WS_URL;
        this.playerId = null;
        this.roomCode = null;
        
        // Game state
        this.gameState = null;
        this.playerIndex = -1; // Which player are we (0 or 1)
        
        // Canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
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
    
    initUI() {
        // Menu buttons
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinInput());
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());
        
        // Join room input
        document.getElementById('join-room-submit').addEventListener('click', () => this.joinRoom());
        document.getElementById('join-room-cancel').addEventListener('click', () => this.hideJoinInput());
        
        // Room code input - auto uppercase
        const roomCodeInput = document.getElementById('room-code-input');
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
        
        // Waiting screen
        document.getElementById('cancel-waiting-btn').addEventListener('click', () => this.cancelWaiting());
        
        // Game over screen
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('main-menu-btn').addEventListener('click', () => this.showScreen('menu'));
        
        // Leaderboard
        document.getElementById('leaderboard-back-btn').addEventListener('click', () => this.showScreen('menu'));
        
        // Keyboard input
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    // ===== WEBSOCKET =====
    
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
                break;
            
            case 'player_joined':
                // Second player joined, start game
                this.showScreen('game');
                this.startPingInterval();
                break;
            
            case 'game_state':
                this.updateGameState(data);
                break;
            
            case 'pong':
                this.handlePong(data);
                break;
            
            case 'score_event':
                this.playScoreSound();
                break;
            
            case 'game_over':
                this.handleGameOver(data);
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
        this.gameState = data;
        
        // Determine our player index
        if (this.playerIndex === -1 && data.players.length > 0) {
            this.playerIndex = data.players.findIndex(p => p.id === this.playerId);
        }
        
        // Update HUD
        this.updateHUD(data);
        
        // Render game
        this.render(data);
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
    
    render(data) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw center line
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (data.players.length >= 2) {
            // Draw paddles
            const paddleWidth = 20;
            const paddleHeight = 100;
            const paddleOffset = 30;
            
            // Left paddle
            ctx.fillStyle = '#00f3ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f3ff';
            ctx.fillRect(
                paddleOffset,
                data.players[0].paddle_y - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );
            
            // Right paddle
            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.fillRect(
                canvas.width - paddleOffset - paddleWidth,
                data.players[1].paddle_y - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );
            
            // Draw ball
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(data.ball.x, data.ball.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
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
        
        // Only send if input changed
        if (newInput !== this.currentInput) {
            this.currentInput = newInput;
            this.send({
                type: 'paddle_input',
                direction: newInput
            });
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
        this.showScreen('menu');
        // Could implement rematch logic here
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
}

// Initialize client when page loads
window.addEventListener('DOMContentLoaded', () => {
    new NetPongClient();
});
