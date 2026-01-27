"""Database connections and session management."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
import structlog

from src.config import settings

logger = structlog.get_logger()

# PostgreSQL
engine = create_async_engine(
    settings.postgres_url,
    echo=settings.env == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# MongoDB
class MongoDB:
    """MongoDB connection manager."""
    
    client: AsyncIOMotorClient = None
    db = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB."""
        try:
            cls.client = AsyncIOMotorClient(
                settings.mongodb_url,
                maxPoolSize=10,
                minPoolSize=1,
            )
            cls.db = cls.client[settings.mongodb_db]
            # Test connection
            await cls.client.admin.command('ping')
            logger.info("Connected to MongoDB", db=settings.mongodb_db)
        except Exception as e:
            logger.error("Failed to connect to MongoDB", error=str(e))
            raise
    
    @classmethod
    async def disconnect(cls):
        """Disconnect from MongoDB."""
        if cls.client:
            cls.client.close()
            logger.info("Disconnected from MongoDB")
    
    @classmethod
    def get_collection(cls, name: str):
        """Get MongoDB collection."""
        if cls.db is None:
            raise RuntimeError("MongoDB not connected")
        return cls.db[name]


# Redis
class RedisClient:
    """Redis connection manager."""
    
    client: Redis = None
    
    @classmethod
    async def connect(cls):
        """Connect to Redis."""
        try:
            cls.client = Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                db=settings.redis_db,
                password=settings.redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            # Test connection
            await cls.client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            raise
    
    @classmethod
    async def disconnect(cls):
        """Disconnect from Redis."""
        if cls.client:
            await cls.client.close()
            logger.info("Disconnected from Redis")
    
    @classmethod
    async def get(cls, key: str) -> str | None:
        """Get value from Redis."""
        if cls.client is None:
            raise RuntimeError("Redis not connected")
        return await cls.client.get(key)
    
    @classmethod
    async def set(cls, key: str, value: str, ttl: int = None):
        """Set value in Redis."""
        if cls.client is None:
            raise RuntimeError("Redis not connected")
        if ttl:
            await cls.client.setex(key, ttl, value)
        else:
            await cls.client.set(key, value)
    
    @classmethod
    async def delete(cls, key: str):
        """Delete key from Redis."""
        if cls.client is None:
            raise RuntimeError("Redis not connected")
        await cls.client.delete(key)
    
    @classmethod
    async def exists(cls, key: str) -> bool:
        """Check if key exists."""
        if cls.client is None:
            raise RuntimeError("Redis not connected")
        return await cls.client.exists(key) > 0


async def init_databases():
    """Initialize all database connections."""
    await MongoDB.connect()
    await RedisClient.connect()
    
    # Create PostgreSQL tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("All databases initialized")


async def close_databases():
    """Close all database connections."""
    await MongoDB.disconnect()
    await RedisClient.disconnect()
    await engine.dispose()
    logger.info("All databases closed")
