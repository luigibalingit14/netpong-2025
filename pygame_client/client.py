"""
NetPong 2025 - PyGame Desktop Client
Real-time multiplayer Pong client with latency visualization
"""

import pygame
import asyncio
import websockets
import json
import time
import sys
from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class GameState:
    """Client-side game state."""
    ball_x: float = 400
    ball_y: float = 300
    player1_paddle_y: float = 300
    player2_paddle_y: float = 300
    player1_score: int = 0
    player2_score: int = 0
    player1_name: str = "Player 1"
    player2_name: str = "Player 2"
    player1_latency: float = 0
    player2_latency: float = 0
    state: str = "waiting"


class NetPongClient:
    """PyGame-based NetPong client."""
    
    # Display constants
    WINDOW_WIDTH = 800
    WINDOW_HEIGHT = 700  # Extra for HUD
    CANVAS_WIDTH = 800
    CANVAS_HEIGHT = 600
    FPS = 60
    
    # Colors (retro-futuristic theme)
    COLOR_BG = (10, 10, 15)
    COLOR_NEON_BLUE = (0, 243, 255)
    COLOR_NEON_PINK = (255, 0, 255)
    COLOR_NEON_GREEN = (57, 255, 20)
    COLOR_WHITE = (255, 255, 255)
    COLOR_GRAY = (160, 160, 160)
    
    def __init__(self):
        # Initialize pygame
        pygame.init()
        self.screen = pygame.display.set_mode((self.WINDOW_WIDTH, self.WINDOW_HEIGHT))
        pygame.display.set_caption("NetPong 2025")
        self.clock = pygame.time.Clock()
        
        # Fonts
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 36)
        self.font_small = pygame.font.Font(None, 24)
        
        # Game state
        self.game_state = GameState()
        self.player_id: Optional[str] = None
        self.room_code: Optional[str] = None
        self.player_index: int = -1
        
        # Input
        self.current_input = 0
        
        # Connection
        self.ws = None
        self.connected = False
        self.server_url = "ws://localhost:8000/ws"
        
        # Latency tracking
        self.last_ping_time = 0
        self.ping_interval = 1.0  # seconds
        
        # UI state
        self.screen_state = "menu"  # menu, waiting, playing, gameover
        self.input_text = ""
        self.player_name = "Player"
        self.input_mode = None  # "name", "room_code"
        self.status_message = "Connecting..."
        
        # Running flag
        self.running = True
    
    async def connect(self):
        """Connect to WebSocket server."""
        try:
            self.ws = await websockets.connect(self.server_url)
            self.connected = True
            self.status_message = "Connected"
            print("✅ Connected to server")
            
            # Wait for connection confirmation
            msg = await self.ws.recv()
            data = json.loads(msg)
            if data['type'] == 'connected':
                self.player_id = data['player_id']
                print(f"Player ID: {self.player_id}")
        
        except Exception as e:
            print(f"❌ Connection error: {e}")
            self.connected = False
            self.status_message = f"Connection error: {e}"
    
    async def send(self, data: dict):
        """Send message to server."""
        if self.ws and self.connected:
            try:
                await self.ws.send(json.dumps(data))
            except Exception as e:
                print(f"Send error: {e}")
    
    async def receive_messages(self):
        """Receive and handle messages from server."""
        if not self.ws:
            return
        
        try:
            async for message in self.ws:
                data = json.loads(message)
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")
            self.connected = False
            self.status_message = "Disconnected"
    
    async def handle_message(self, data: dict):
        """Handle incoming messages."""
        msg_type = data.get('type')
        
        if msg_type == 'room_created':
            self.room_code = data['room_code']
            self.screen_state = 'waiting'
            print(f"Room created: {self.room_code}")
        
        elif msg_type == 'room_joined':
            self.room_code = data['room_code']
            self.screen_state = 'playing'
            print(f"Joined room: {self.room_code}")
        
        elif msg_type == 'player_joined':
            self.screen_state = 'playing'
            print("Second player joined!")
        
        elif msg_type == 'game_state':
            self.update_game_state(data)
        
        elif msg_type == 'pong':
            self.handle_pong(data)
        
        elif msg_type == 'game_over':
            self.screen_state = 'gameover'
            self.status_message = f"{data['winner']} WINS!"
        
        elif msg_type == 'player_disconnected':
            self.status_message = "Opponent disconnected"
            self.screen_state = 'menu'
        
        elif msg_type == 'error':
            print(f"Error: {data['message']}")
            self.status_message = data['message']
    
    def update_game_state(self, data: dict):
        """Update game state from server."""
        self.game_state.state = data['state']
        
        # Ball
        self.game_state.ball_x = data['ball']['x']
        self.game_state.ball_y = data['ball']['y']
        
        # Players
        if len(data['players']) >= 2:
            # Determine our player index
            if self.player_index == -1:
                for i, player in enumerate(data['players']):
                    if player['id'] == self.player_id:
                        self.player_index = i
                        break
            
            # Update state
            self.game_state.player1_name = data['players'][0]['name']
            self.game_state.player1_paddle_y = data['players'][0]['paddle_y']
            self.game_state.player1_score = data['players'][0]['score']
            self.game_state.player1_latency = data['players'][0]['latency_ms']
            
            self.game_state.player2_name = data['players'][1]['name']
            self.game_state.player2_paddle_y = data['players'][1]['paddle_y']
            self.game_state.player2_score = data['players'][1]['score']
            self.game_state.player2_latency = data['players'][1]['latency_ms']
    
    async def send_ping(self):
        """Send ping for latency measurement."""
        current_time = time.time()
        if current_time - self.last_ping_time >= self.ping_interval:
            self.last_ping_time = current_time
            await self.send({
                'type': 'ping',
                'timestamp': time.time() * 1000  # milliseconds
            })
    
    def handle_pong(self, data: dict):
        """Handle pong response and calculate latency."""
        now = time.time() * 1000
        latency = now - data['client_timestamp']
        
        # Send latency update
        asyncio.create_task(self.send({
            'type': 'latency_update',
            'latency_ms': latency
        }))
    
    async def handle_input(self):
        """Handle pygame events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            elif event.type == pygame.KEYDOWN:
                await self.handle_keydown(event.key)
            
            elif event.type == pygame.KEYUP:
                await self.handle_keyup(event.key)
        
        # Update paddle input during gameplay
        if self.screen_state == 'playing':
            keys = pygame.key.get_pressed()
            new_input = 0
            
            if keys[pygame.K_UP] or keys[pygame.K_w]:
                new_input = -1
            elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
                new_input = 1
            
            if new_input != self.current_input:
                self.current_input = new_input
                await self.send({
                    'type': 'paddle_input',
                    'direction': new_input
                })
    
    async def handle_keydown(self, key):
        """Handle key press events."""
        if self.input_mode:
            if key == pygame.K_RETURN:
                await self.submit_input()
            elif key == pygame.K_ESCAPE:
                self.input_mode = None
                self.input_text = ""
            elif key == pygame.K_BACKSPACE:
                self.input_text = self.input_text[:-1]
            else:
                # Add character to input
                char = pygame.key.name(key)
                if len(char) == 1 and len(self.input_text) < 20:
                    self.input_text += char.upper()
        
        elif self.screen_state == 'menu':
            if key == pygame.K_c:  # Create room
                self.input_mode = 'name'
                self.input_text = self.player_name
            elif key == pygame.K_j:  # Join room
                self.input_mode = 'room_code'
                self.input_text = ""
        
        elif self.screen_state == 'gameover':
            if key == pygame.K_SPACE:
                self.screen_state = 'menu'
    
    async def handle_keyup(self, key):
        """Handle key release events."""
        pass
    
    async def submit_input(self):
        """Submit text input."""
        if self.input_mode == 'name':
            self.player_name = self.input_text or "Player"
            await self.send({
                'type': 'create_room',
                'player_name': self.player_name
            })
            self.input_mode = None
            self.input_text = ""
        
        elif self.input_mode == 'room_code':
            room_code = self.input_text.strip()
            if len(room_code) == 4:
                await self.send({
                    'type': 'join_room',
                    'room_code': room_code,
                    'player_name': self.player_name
                })
            self.input_mode = None
            self.input_text = ""
    
    def render(self):
        """Render the current screen."""
        self.screen.fill(self.COLOR_BG)
        
        if self.screen_state == 'menu':
            self.render_menu()
        elif self.screen_state == 'waiting':
            self.render_waiting()
        elif self.screen_state == 'playing':
            self.render_game()
        elif self.screen_state == 'gameover':
            self.render_gameover()
        
        # Status message
        status_text = self.font_small.render(
            f"Status: {self.status_message}",
            True,
            self.COLOR_GRAY
        )
        self.screen.blit(status_text, (10, self.WINDOW_HEIGHT - 30))
        
        pygame.display.flip()
    
    def render_menu(self):
        """Render main menu."""
        # Title
        title = self.font_large.render("NETPONG 2025", True, self.COLOR_NEON_BLUE)
        title_rect = title.get_rect(center=(self.WINDOW_WIDTH // 2, 150))
        self.screen.blit(title, title_rect)
        
        # Instructions
        y = 300
        instructions = [
            "Press C to CREATE ROOM",
            "Press J to JOIN ROOM",
            "ESC to cancel input",
        ]
        
        for text in instructions:
            rendered = self.font_medium.render(text, True, self.COLOR_WHITE)
            rect = rendered.get_rect(center=(self.WINDOW_WIDTH // 2, y))
            self.screen.blit(rendered, rect)
            y += 50
        
        # Input mode
        if self.input_mode == 'name':
            prompt = self.font_medium.render(
                f"Enter name: {self.input_text}_",
                True,
                self.COLOR_NEON_GREEN
            )
            rect = prompt.get_rect(center=(self.WINDOW_WIDTH // 2, 500))
            self.screen.blit(prompt, rect)
        
        elif self.input_mode == 'room_code':
            prompt = self.font_medium.render(
                f"Enter room code: {self.input_text}_",
                True,
                self.COLOR_NEON_GREEN
            )
            rect = prompt.get_rect(center=(self.WINDOW_WIDTH // 2, 500))
            self.screen.blit(prompt, rect)
    
    def render_waiting(self):
        """Render waiting for opponent screen."""
        # Title
        title = self.font_large.render("WAITING...", True, self.COLOR_NEON_PINK)
        title_rect = title.get_rect(center=(self.WINDOW_WIDTH // 2, 200))
        self.screen.blit(title, title_rect)
        
        # Room code
        if self.room_code:
            code_text = self.font_large.render(
                self.room_code,
                True,
                self.COLOR_NEON_BLUE
            )
            code_rect = code_text.get_rect(center=(self.WINDOW_WIDTH // 2, 350))
            self.screen.blit(code_text, code_rect)
            
            label = self.font_medium.render("Share this code!", True, self.COLOR_GRAY)
            label_rect = label.get_rect(center=(self.WINDOW_WIDTH // 2, 420))
            self.screen.blit(label, label_rect)
    
    def render_game(self):
        """Render active game."""
        # Game area
        game_y_offset = 100
        
        # HUD
        self.render_hud()
        
        # Game canvas background
        pygame.draw.rect(
            self.screen,
            (0, 0, 0),
            (0, game_y_offset, self.CANVAS_WIDTH, self.CANVAS_HEIGHT)
        )
        
        # Center line
        for y in range(game_y_offset, game_y_offset + self.CANVAS_HEIGHT, 20):
            pygame.draw.rect(
                self.screen,
                self.COLOR_GRAY,
                (self.CANVAS_WIDTH // 2 - 2, y, 4, 10)
            )
        
        # Paddles
        paddle_width = 20
        paddle_height = 100
        paddle_offset = 30
        
        # Left paddle
        pygame.draw.rect(
            self.screen,
            self.COLOR_NEON_BLUE,
            (
                paddle_offset,
                game_y_offset + self.game_state.player1_paddle_y - paddle_height // 2,
                paddle_width,
                paddle_height
            )
        )
        
        # Right paddle
        pygame.draw.rect(
            self.screen,
            self.COLOR_NEON_PINK,
            (
                self.CANVAS_WIDTH - paddle_offset - paddle_width,
                game_y_offset + self.game_state.player2_paddle_y - paddle_height // 2,
                paddle_width,
                paddle_height
            )
        )
        
        # Ball
        pygame.draw.circle(
            self.screen,
            self.COLOR_WHITE,
            (int(self.game_state.ball_x), int(game_y_offset + self.game_state.ball_y)),
            10
        )
    
    def render_hud(self):
        """Render game HUD."""
        # Player 1 info
        p1_name = self.font_small.render(
            self.game_state.player1_name,
            True,
            self.COLOR_GRAY
        )
        self.screen.blit(p1_name, (20, 20))
        
        p1_score = self.font_large.render(
            str(self.game_state.player1_score),
            True,
            self.COLOR_NEON_BLUE
        )
        self.screen.blit(p1_score, (20, 40))
        
        # Player 1 latency
        latency_color = self.get_latency_color(self.game_state.player1_latency)
        p1_latency = self.font_small.render(
            f"{int(self.game_state.player1_latency)}ms",
            True,
            latency_color
        )
        self.screen.blit(p1_latency, (20, 80))
        
        # Player 2 info
        p2_name = self.font_small.render(
            self.game_state.player2_name,
            True,
            self.COLOR_GRAY
        )
        p2_name_rect = p2_name.get_rect(topright=(self.WINDOW_WIDTH - 20, 20))
        self.screen.blit(p2_name, p2_name_rect)
        
        p2_score = self.font_large.render(
            str(self.game_state.player2_score),
            True,
            self.COLOR_NEON_PINK
        )
        p2_score_rect = p2_score.get_rect(topright=(self.WINDOW_WIDTH - 20, 40))
        self.screen.blit(p2_score, p2_score_rect)
        
        # Player 2 latency
        latency_color = self.get_latency_color(self.game_state.player2_latency)
        p2_latency = self.font_small.render(
            f"{int(self.game_state.player2_latency)}ms",
            True,
            latency_color
        )
        p2_latency_rect = p2_latency.get_rect(topright=(self.WINDOW_WIDTH - 20, 80))
        self.screen.blit(p2_latency, p2_latency_rect)
    
    def render_gameover(self):
        """Render game over screen."""
        title = self.font_large.render("GAME OVER", True, self.COLOR_NEON_PINK)
        title_rect = title.get_rect(center=(self.WINDOW_WIDTH // 2, 200))
        self.screen.blit(title, title_rect)
        
        # Winner
        winner_text = self.font_medium.render(
            self.status_message,
            True,
            self.COLOR_NEON_GREEN
        )
        winner_rect = winner_text.get_rect(center=(self.WINDOW_WIDTH // 2, 300))
        self.screen.blit(winner_text, winner_rect)
        
        # Scores
        scores = self.font_medium.render(
            f"{self.game_state.player1_name}: {self.game_state.player1_score}  -  "
            f"{self.game_state.player2_name}: {self.game_state.player2_score}",
            True,
            self.COLOR_WHITE
        )
        scores_rect = scores.get_rect(center=(self.WINDOW_WIDTH // 2, 400))
        self.screen.blit(scores, scores_rect)
        
        # Instruction
        instruction = self.font_small.render(
            "Press SPACE to return to menu",
            True,
            self.COLOR_GRAY
        )
        instruction_rect = instruction.get_rect(center=(self.WINDOW_WIDTH // 2, 500))
        self.screen.blit(instruction, instruction_rect)
    
    def get_latency_color(self, latency: float):
        """Get color based on latency value."""
        if latency < 50:
            return self.COLOR_NEON_GREEN
        elif latency < 100:
            return (255, 255, 0)  # Yellow
        elif latency < 200:
            return (255, 165, 0)  # Orange
        else:
            return (255, 0, 0)  # Red
    
    async def game_loop(self):
        """Main game loop."""
        # Connect to server
        await self.connect()
        
        # Start message receiver
        asyncio.create_task(self.receive_messages())
        
        # Main loop
        while self.running:
            # Handle input
            await self.handle_input()
            
            # Send ping if playing
            if self.screen_state == 'playing':
                await self.send_ping()
            
            # Render
            self.render()
            
            # Cap framerate
            self.clock.tick(self.FPS)
            
            # Small async yield
            await asyncio.sleep(0)
        
        # Cleanup
        if self.ws:
            await self.ws.close()
        
        pygame.quit()
        sys.exit()


async def main():
    """Entry point."""
    client = NetPongClient()
    await client.game_loop()


if __name__ == "__main__":
    asyncio.run(main())
