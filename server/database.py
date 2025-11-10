from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, create_engine, Session, select


class LeaderboardEntry(SQLModel, table=True):
    """Persistent leaderboard entry for completed matches."""
    __tablename__ = "leaderboard"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    player_name: str = Field(index=True)
    opponent_name: str
    player_score: int
    opponent_score: int
    avg_latency_ms: float
    match_date: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def won(self) -> bool:
        return self.player_score > self.opponent_score


# Database setup
DATABASE_URL = "sqlite:///./netpong.db"
engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables():
    """Initialize database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get database session."""
    with Session(engine) as session:
        yield session


def add_match_result(
    player_name: str,
    opponent_name: str,
    player_score: int,
    opponent_score: int,
    avg_latency_ms: float
) -> LeaderboardEntry:
    """Save a match result to the leaderboard."""
    with Session(engine) as session:
        entry = LeaderboardEntry(
            player_name=player_name,
            opponent_name=opponent_name,
            player_score=player_score,
            opponent_score=opponent_score,
            avg_latency_ms=avg_latency_ms
        )
        session.add(entry)
        session.commit()
        session.refresh(entry)
        return entry


def get_leaderboard(limit: int = 10):
    """Get top players by win count and total score."""
    with Session(engine) as session:
        # Get all entries and calculate stats
        statement = select(LeaderboardEntry)
        results = session.exec(statement).all()
        
        # Aggregate by player
        player_stats = {}
        for entry in results:
            name = entry.player_name
            if name not in player_stats:
                player_stats[name] = {
                    "player_name": name,
                    "total_wins": 0,
                    "total_matches": 0,
                    "total_score": 0,
                    "avg_latency_ms": 0,
                    "latency_sum": 0
                }
            
            stats = player_stats[name]
            stats["total_matches"] += 1
            stats["total_score"] += entry.player_score
            stats["latency_sum"] += entry.avg_latency_ms
            if entry.won:
                stats["total_wins"] += 1
        
        # Calculate averages and sort
        leaderboard = []
        for stats in player_stats.values():
            stats["avg_latency_ms"] = round(stats["latency_sum"] / stats["total_matches"], 2)
            stats["win_rate"] = round(stats["total_wins"] / stats["total_matches"] * 100, 1)
            del stats["latency_sum"]  # Remove temporary field
            leaderboard.append(stats)
        
        # Sort by wins, then total score
        leaderboard.sort(key=lambda x: (x["total_wins"], x["total_score"]), reverse=True)
        
        return leaderboard[:limit]
