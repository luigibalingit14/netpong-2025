import time
import uuid
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from database import create_db_and_tables, get_leaderboard
from room_manager import manager


# Initialize FastAPI app
app = FastAPI(
    title="NetPong 2025 API",
    description="Real-time multiplayer Pong with latency visualization",
    version="1.0.0"
)

# CORS middleware for web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class CreateRoomRequest(BaseModel):
    player_name: str


class JoinRoomRequest(BaseModel):
    room_code: str
    player_name: str


# REST endpoints
@app.get("/")
async def root():
    """API health check."""
    return {
        "name": "NetPong 2025 API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws",
            "leaderboard": "/leaderboard",
            "rooms": "/rooms"
        }
    }


@app.get("/leaderboard")
async def leaderboard(limit: int = 10):
    """Get top players leaderboard."""
    try:
        data = get_leaderboard(limit=limit)
        return JSONResponse(content={
            "success": True,
            "data": data,
            "count": len(data)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rooms")
async def list_rooms():
    """List active rooms (for debugging)."""
    rooms = []
    for code, game in manager.rooms.items():
        rooms.append({
            "code": code,
            "state": game.state.value,
            "players": len(game.players),
            "frame": game.frame_count
        })
    
    return JSONResponse(content={
        "success": True,
        "rooms": rooms,
        "count": len(rooms)
    })


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for game communication."""
    await websocket.accept()
    
    player_id = str(uuid.uuid4())
    room_code: Optional[str] = None
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "player_id": player_id,
            "message": "Connected to NetPong server"
        })
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            # Handle different message types
            if message_type == "create_room":
                player_name = data.get("player_name", "Player")
                room_code = await manager.create_room(player_id, player_name, websocket)
                
                await websocket.send_json({
                    "type": "room_created",
                    "room_code": room_code,
                    "player_id": player_id
                })
            
            elif message_type == "join_room":
                room_code = data.get("room_code", "").upper()
                player_name = data.get("player_name", "Player")
                
                success = await manager.join_room(room_code, player_id, player_name, websocket)
                
                if success:
                    await websocket.send_json({
                        "type": "room_joined",
                        "room_code": room_code,
                        "player_id": player_id
                    })
                    
                    # Notify other players
                    await manager.broadcast_to_room(room_code, {
                        "type": "player_joined",
                        "player_name": player_name
                    }, exclude=player_id)
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to join room. Room may be full or not exist."
                    })
            
            elif message_type == "paddle_input":
                # Update paddle velocity
                direction = data.get("direction", 0)  # -1, 0, or 1
                
                if room_code:
                    game = manager.get_room(room_code)
                    if game:
                        game.update_paddle_input(player_id, direction)
            
            elif message_type == "ping":
                # Respond to ping for latency measurement
                client_timestamp = data.get("timestamp", time.time())
                
                await websocket.send_json({
                    "type": "pong",
                    "client_timestamp": client_timestamp,
                    "server_timestamp": time.time()
                })
                
                # Update player latency
                if room_code:
                    game = manager.get_room(room_code)
                    if game and player_id in game.players:
                        # Client will send the calculated latency back
                        pass
            
            elif message_type == "latency_update":
                # Client sends calculated latency
                latency_ms = data.get("latency_ms", 0)
                
                if room_code:
                    game = manager.get_room(room_code)
                    if game and player_id in game.players:
                        game.players[player_id].add_latency_sample(latency_ms)
            
            elif message_type == "disconnect":
                break
    
    except WebSocketDisconnect:
        print(f"Player {player_id} disconnected")
    except Exception as e:
        print(f"WebSocket error for player {player_id}: {e}")
    finally:
        await manager.disconnect(player_id)


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    create_db_and_tables()
    print("✅ Database initialized")
    print("🚀 NetPong server ready on http://localhost:8000")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
