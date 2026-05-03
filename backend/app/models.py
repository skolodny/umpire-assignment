'''SQLAlchemy models for the umpire assignment system.'''

import enum
from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, Date, Time,
    DateTime, Boolean, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    '''Base class for SQLAlchemy models. All models should inherit from this class.'''


class UserRole(str, enum.Enum):
    '''Role of a user in the system. Umpires can be assigned to games, 
    admins can manage games and assignments.'''
    umpire = "umpire"
    admin = "admin"


class Division(str, enum.Enum):
    '''Baseball divisions. Umpires can have preferences for which divisions they want to umpire in. 
    Games belong to a division.'''
    rookies = "rookies"
    int_i = "int_i"
    int_ii = "int_ii"


class AssignmentStatus(str, enum.Enum):
    '''Status of an umpire assignment to a game.'''
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"


class User(Base):
    '''User model representing umpires and admins. 
    Supports authentication via Supabase or email/password.'''
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    supabase_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.umpire)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    availability_slots = relationship("AvailabilitySlot",
                                      back_populates="user",
                                      cascade="all, delete-orphan")
    division_preferences = relationship("DivisionPreference",
                                        back_populates="user",
                                        cascade="all, delete-orphan")
    assignments = relationship("Assignment",
                               back_populates="umpire",
                               cascade="all, delete-orphan")


class AvailabilitySlot(Base):
    '''Model representing a time slot when an umpire is available to umpire games. 
    Umpires can create multiple availability slots.'''
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    user = relationship("User", back_populates="availability_slots")


class DivisionPreference(Base):
    '''Model representing an umpire's preference for which divisions they want to umpire in. 
    Umpires can have multiple division preferences.'''
    __tablename__ = "division_preferences"
    __table_args__ = (UniqueConstraint("user_id", "division"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    division = Column(Enum(Division), nullable=False)

    user = relationship("User", back_populates="division_preferences")


class Game(Base):
    '''Model representing a baseball game. 
    Games belong to a division and have associated umpire assignments.'''
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    external_uid = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    division = Column(Enum(Division), nullable=True)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    location = Column(String, nullable=True)
    home_team = Column(String, nullable=True)
    away_team = Column(String, nullable=True)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())

    assignments = relationship("Assignment", back_populates="game", cascade="all, delete-orphan")


class Assignment(Base):
    '''Model representing the assignment of an umpire to a game. 
    Contains status and timestamps for when the assignment was made and responded to.'''
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    umpire_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.pending)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
    notified_admin = Column(Boolean, default=False)

    game = relationship("Game", back_populates="assignments")
    umpire = relationship("User", back_populates="assignments")
