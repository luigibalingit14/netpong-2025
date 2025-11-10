import asyncio
import random
import string
import time
from typing import Dict, Optional
from fastapi import WebSocket
from game import Game
from database import add_match_result


class ConnectionManager:
    """Manages WebSocket connections and game rooms."""
    
    def __init__(self):
        self.rooms: Dict[str, Game] = {}
        self.connections: Dict[str, WebSocket] = {}  # player_id -> websocket
        self.player_to_room: Dict[str, str] = {}  # player_id -> room_code
        self.game_loops: Dict[str, asyncio.Task] = {}  # room_code -> game loop task
    
    def generate_room_code(self) -> str:
        """Generate a unique 4-character room code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if code not in self.rooms:
                return code
    
    async def create_room(self, player_id: str, player_name: str, websocket: WebSocket) -> str:
        """Create a new game room."""
        room_code = self.generate_room_code()
        game = Game(room_code)
        game.add_player(player_id, player_name)
        
        self.rooms[room_code] = game
        self.connections[player_id] = websocket
        self.player_to_room[player_id] = room_code
        
        return room_code
    
    async def join_room(self, room_code: str, player_id: str, player_name: str, websocket: WebSocket) -> bool:
        """Join an existing room. Returns True if successful."""
        room_code = room_code.upper()
        
        if room_code not in self.rooms:
            return False
        
        game = self.rooms[room_code]
        if not game.add_player(player_id, player_name):
            return False
        
        self.connections[player_id] = websocket
        self.player_to_room[player_id] = room_code
        
        # Start game loop when second player joins
        if len(game.players) == 2 and room_code not in self.game_loops:
            self.game_loops[room_code] = asyncio.create_task(self.game_loop(room_code))
        
        return True
    
    async def disconnect(self, player_id: str):
        """Handle player disconnection."""
        if player_id not in self.player_to_room:
            return
        
        room_code = self.player_to_room[player_id]
        
        # Notify other players
        await self.broadcast_to_room(room_code, {
            "type": "player_disconnected",
            "player_id": player_id
        }, exclude=player_id)
        
        # Clean up
        if room_code in self.rooms:
            game = self.rooms[room_code]
            game.remove_player(player_id)
            
            # If game is now empty, clean up room
            if len(game.players) == 0:
                if room_code in self.game_loops:
                    self.game_loops[room_code].cancel()
                    del self.game_loops[room_code]
                del self.rooms[room_code]
        
        if player_id in self.connections:
            del self.connections[player_id]
        
        if player_id in self.player_to_room:
            del self.player_to_room[player_id]
    
    async def broadcast_to_room(self, room_code: str, message: dict, exclude: Optional[str] = None):
        """Send message to all players in a room."""
        if room_code not in self.rooms:
            return
        
        game = self.rooms[room_code]
        for player_id in game.players.keys():
            if player_id != exclude and player_id in self.connections:
                try:
                    await self.connections[player_id].send_json(message)
                except Exception as e:
                    print(f"Error sending to {player_id}: {e}")
    
    async def send_to_player(self, player_id: str, message: dict):
        """Send message to a specific player."""
        if player_id in self.connections:
            try:
                await self.connections[player_id].send_json(message)
            except Exception as e:
                print(f"Error sending to {player_id}: {e}")
    
    async def game_loop(self, room_code: str):
        """Main game loop for a room (60 FPS)."""
        if room_code not in self.rooms:
            return
        
        game = self.rooms[room_code]
        frame_time = game.FRAME_TIME
        
        try:
            while game.state.value in ["waiting", "playing"]:
                loop_start = time.time()
                
                # Update game state
                event = game.update()
                
                # Broadcast state to all players
                state = game.get_state_dict()
                await self.broadcast_to_room(room_code, state)
                
                # Handle events
                if event == "score":
                    await self.broadcast_to_room(room_code, {"type": "score_event"})
                
                elif event == "game_over":
                    # Save to leaderboard
                    result = game.get_match_result()
                    if result:
                        p1_name, p2_name, p1_score, p2_score, avg_latency = result
                        
                        # Save both perspectives
                        add_match_result(p1_name, p2_name, p1_score, p2_score, avg_latency)
                        add_match_result(p2_name, p1_name, p2_score, p1_score, avg_latency)
                    
                    await self.broadcast_to_room(room_code, {
                        "type": "game_over",
                        "winner": max(game.players.values(), key=lambda p: p.score).name
                    })
                    break
                
                # Sleep to maintain FPS
                elapsed = time.time() - loop_start
                sleep_time = max(0, frame_time - elapsed)
                await asyncio.sleep(sleep_time)
        
        except asyncio.CancelledError:
            print(f"Game loop for room {room_code} cancelled")
        except Exception as e:
            print(f"Error in game loop for room {room_code}: {e}")
        finally:
            # Clean up
            if room_code in self.game_loops:
                del self.game_loops[room_code]
    
    def get_room(self, room_code: str) -> Optional[Game]:
        """Get a game room."""
        return self.rooms.get(room_code.upper())
    
    def get_player_room(self, player_id: str) -> Optional[str]:
        """Get the room code for a player."""
        return self.player_to_room.get(player_id)


# Global connection manager
manager = ConnectionManager()
