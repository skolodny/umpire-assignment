'''Database connection management using SQLAlchemy. 
Provides functions to get the engine, session factory, and database sessions. 
Also includes a FastAPI dependency for getting a database session during requests.'''

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

_engine = None
_SessionLocal = None


def get_engine():
    '''Get the SQLAlchemy engine, creating it if it doesn't exist. 
    The engine is used to manage database connections.'''
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url)
    return _engine


def get_session_factory():
    '''Get the SQLAlchemy session factory, creating it if it doesn't exist. 
    The session factory is used to create database sessions.'''
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False,
                                     autoflush=False,
                                     bind=get_engine())
    return _SessionLocal


def SessionLocal():
    '''Get a new database session. Caller is responsible for closing it.'''
    return get_session_factory()()


def get_db():
    '''FastAPI dependency that provides a database session for the duration of a request.'''
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
