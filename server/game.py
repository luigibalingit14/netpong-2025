import time
import math
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class GameState(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"


@dataclass
class Vector2:
    """Simple 2D vector for position and velocity."""
    x: float = 0.0
    y: float = 0.0
    
    def __add__(self, other):
        return Vector2(self.x + other.x, self.y + other.y)
    
    def __mul__(self, scalar):
        return Vector2(self.x * scalar, self.y * scalar)


@dataclass
class Paddle:
    """Player paddle."""
    y: float = 300.0  # Center position
    velocity: float = 0.0
    width: float = 20.0
    height: float = 100.0
    speed: float = 400.0  # pixels per second


@dataclass
class Ball:
    """Game ball."""
    position: Vector2 = field(default_factory=lambda: Vector2(400, 300))
    velocity: Vector2 = field(default_factory=lambda: Vector2(300, 200))
    radius: float = 10.0
    max_speed: float = 600.0


@dataclass
class PlayerState:
    """Individual player state."""
    player_id: str
    name: str
    paddle: Paddle = field(default_factory=Paddle)
    score: int = 0
    latency_samples: list = field(default_factory=list)
    last_ping_time: float = 0.0
    
    @property
    def avg_latency_ms(self) -> float:
        if not self.latency_samples:
            return 0.0
        return sum(self.latency_samples) / len(self.latency_samples)
    
    def add_latency_sample(self, latency_ms: float):
        """Add latency sample (keep last 20)."""
        self.latency_samples.append(latency_ms)
        if len(self.latency_samples) > 20:
            self.latency_samples.pop(0)


class Game:
    """Server-authoritative Pong game logic."""
    
    # Game constants
    CANVAS_WIDTH = 800
    CANVAS_HEIGHT = 600
    PADDLE_OFFSET = 30  # Distance from edge
    WINNING_SCORE = 5
    FPS = 60
    FRAME_TIME = 1.0 / FPS
    
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.state = GameState.WAITING
        self.players: Dict[str, PlayerState] = {}
        self.ball = Ball()
        self.last_update = time.time()
        self.frame_count = 0
        
    def add_player(self, player_id: str, name: str) -> bool:
        """Add a player to the game. Returns True if successful."""
        if len(self.players) >= 2:
            return False
        
        self.players[player_id] = PlayerState(player_id=player_id, name=name)
        
        # Start game when both players are ready
        if len(self.players) == 2:
            self.start_game()
        
        return True
    
    def remove_player(self, player_id: str):
        """Remove a player and end game."""
        if player_id in self.players:
            del self.players[player_id]
        
        if len(self.players) < 2 and self.state == GameState.PLAYING:
            self.state = GameState.FINISHED
    
    def start_game(self):
        """Initialize game state."""
        self.state = GameState.PLAYING
        self.reset_ball()
        self.frame_count = 0
        
        # Position paddles
        player_list = list(self.players.values())
        player_list[0].paddle.y = self.CANVAS_HEIGHT / 2
        player_list[1].paddle.y = self.CANVAS_HEIGHT / 2
    
    def reset_ball(self, direction: int = 1):
        """Reset ball to center with random angle."""
        import random
        self.ball.position = Vector2(self.CANVAS_WIDTH / 2, self.CANVAS_HEIGHT / 2)
        
        # Random angle between -45 and 45 degrees
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        speed = 300.0
        
        self.ball.velocity = Vector2(
            speed * direction * math.cos(angle),
            speed * math.sin(angle)
        )
    
    def update_paddle_input(self, player_id: str, direction: int):
        """Update paddle velocity based on input (-1, 0, or 1)."""
        if player_id in self.players:
            paddle = self.players[player_id].paddle
            paddle.velocity = direction * paddle.speed
    
    def update(self) -> Optional[str]:
        """
        Update game state. Returns event type if significant event occurs.
        Should be called at FPS rate.
        """
        if self.state != GameState.PLAYING:
            return None
        
        current_time = time.time()
        dt = current_time - self.last_update
        self.last_update = current_time
        
        # Cap delta time to prevent large jumps
        dt = min(dt, self.FRAME_TIME * 2)
        
        # Update paddles
        player_list = list(self.players.values())
        for i, player in enumerate(player_list):
            paddle = player.paddle
            paddle.y += paddle.velocity * dt
            
            # Clamp paddle position
            half_height = paddle.height / 2
            paddle.y = max(half_height, min(self.CANVAS_HEIGHT - half_height, paddle.y))
        
        # Update ball
        self.ball.position = self.ball.position + self.ball.velocity * dt
        
        # Ball collision with top/bottom walls
        if self.ball.position.y - self.ball.radius <= 0:
            self.ball.position.y = self.ball.radius
            self.ball.velocity.y = abs(self.ball.velocity.y)
        elif self.ball.position.y + self.ball.radius >= self.CANVAS_HEIGHT:
            self.ball.position.y = self.CANVAS_HEIGHT - self.ball.radius
            self.ball.velocity.y = -abs(self.ball.velocity.y)
        
        # Ball collision with paddles
        if len(player_list) >= 2:
            # Left paddle (player 0)
            left_paddle = player_list[0].paddle
            left_x = self.PADDLE_OFFSET + left_paddle.width / 2
            
            if (self.ball.position.x - self.ball.radius <= left_x + left_paddle.width / 2 and
                abs(self.ball.position.y - left_paddle.y) <= left_paddle.height / 2 + self.ball.radius):
                
                if self.ball.velocity.x < 0:  # Only bounce if moving toward paddle
                    self.ball.position.x = left_x + left_paddle.width / 2 + self.ball.radius
                    self.ball.velocity.x = abs(self.ball.velocity.x) * 1.05  # Speed up slightly
                    
                    # Add spin based on paddle position
                    relative_intersect = (left_paddle.y - self.ball.position.y) / (left_paddle.height / 2)
                    self.ball.velocity.y += -relative_intersect * 100
            
            # Right paddle (player 1)
            right_paddle = player_list[1].paddle
            right_x = self.CANVAS_WIDTH - self.PADDLE_OFFSET - right_paddle.width / 2
            
            if (self.ball.position.x + self.ball.radius >= right_x - right_paddle.width / 2 and
                abs(self.ball.position.y - right_paddle.y) <= right_paddle.height / 2 + self.ball.radius):
                
                if self.ball.velocity.x > 0:  # Only bounce if moving toward paddle
                    self.ball.position.x = right_x - right_paddle.width / 2 - self.ball.radius
                    self.ball.velocity.x = -abs(self.ball.velocity.x) * 1.05  # Speed up slightly
                    
                    # Add spin based on paddle position
                    relative_intersect = (right_paddle.y - self.ball.position.y) / (right_paddle.height / 2)
                    self.ball.velocity.y += -relative_intersect * 100
        
        # Cap ball speed
        speed = math.sqrt(self.ball.velocity.x ** 2 + self.ball.velocity.y ** 2)
        if speed > self.ball.max_speed:
            scale = self.ball.max_speed / speed
            self.ball.velocity.x *= scale
            self.ball.velocity.y *= scale
        
        # Check for scoring
        if self.ball.position.x < 0:
            # Right player scores
            player_list[1].score += 1
            self.reset_ball(direction=1)
            
            if player_list[1].score >= self.WINNING_SCORE:
                self.state = GameState.FINISHED
                return "game_over"
            
            return "score"
        
        elif self.ball.position.x > self.CANVAS_WIDTH:
            # Left player scores
            player_list[0].score += 1
            self.reset_ball(direction=-1)
            
            if player_list[0].score >= self.WINNING_SCORE:
                self.state = GameState.FINISHED
                return "game_over"
            
            return "score"
        
        self.frame_count += 1
        return None
    
    def get_state_dict(self) -> dict:
        """Serialize game state for clients."""
        player_list = list(self.players.values())
        
        return {
            "type": "game_state",
            "state": self.state.value,
            "frame": self.frame_count,
            "ball": {
                "x": round(self.ball.position.x, 2),
                "y": round(self.ball.position.y, 2),
                "vx": round(self.ball.velocity.x, 2),
                "vy": round(self.ball.velocity.y, 2)
            },
            "players": [
                {
                    "id": p.player_id,
                    "name": p.name,
                    "paddle_y": round(p.paddle.y, 2),
                    "score": p.score,
                    "latency_ms": round(p.avg_latency_ms, 2)
                }
                for p in player_list
            ]
        }
    
    def get_match_result(self) -> Optional[Tuple[str, str, int, int, float]]:
        """Get match result (player1_name, player2_name, score1, score2, avg_latency)."""
        if self.state != GameState.FINISHED or len(self.players) < 2:
            return None
        
        player_list = list(self.players.values())
        avg_latency = (player_list[0].avg_latency_ms + player_list[1].avg_latency_ms) / 2
        
        return (
            player_list[0].name,
            player_list[1].name,
            player_list[0].score,
            player_list[1].score,
            avg_latency
        )
