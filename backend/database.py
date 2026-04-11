import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "mydatabase")

# Async MongoDB client
client: AsyncIOMotorClient = None
database = None

async def connect_to_mongodb():
    """Initialize MongoDB connection"""
    global client, database
    
    try:
        client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        
        # Test the connection
        await client.admin.command('ping')
        
        # Get database
        database = client[DATABASE_NAME]
        
        print(f"Connected to MongoDB: {DATABASE_NAME}")
        return database
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        print("Using mock data mode - MongoDB not available")
        # Return None to indicate mock mode
        return None

async def get_database():
    """Get database instance (creates connection if needed)"""
    global database
    
    if database is None:
        await connect_to_mongodb()
    
    return database

async def close_mongodb_connection():
    """Close MongoDB connection"""
    global client
    
    if client:
        client.close()
        print("MongoDB connection closed")

# Database collections
async def get_scans_collection():
    """Get scans collection"""
    db = await get_database()
    return db.scans

async def get_users_collection():
    """Get users collection"""
    db = await get_database()
    return db.users

async def get_medicines_collection():
    """Get medicines collection"""
    db = await get_database()
    return db.medicines
