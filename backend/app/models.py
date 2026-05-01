import enum
from datetime import date, time, datetime
from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, Date, Time,
    DateTime, Boolean, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    umpire = "umpire"
    admin = "admin"


class Division(str, enum.Enum):
    rookies = "rookies"
    int_i = "int_i"
    int_ii = "int_ii"


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.umpire)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    availability_slots = relationship("AvailabilitySlot", back_populates="user", cascade="all, delete-orphan")
    division_preferences = relationship("DivisionPreference", back_populates="user", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="umpire", cascade="all, delete-orphan")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    user = relationship("User", back_populates="availability_slots")


class DivisionPreference(Base):
    __tablename__ = "division_preferences"
    __table_args__ = (UniqueConstraint("user_id", "division"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    division = Column(Enum(Division), nullable=False)

    user = relationship("User", back_populates="division_preferences")


class Game(Base):
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
