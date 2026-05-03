# pylint: disable=no-member, invalid-name
"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-05-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ''''Create the initial database schema with tables for users, 
    games, availability slots, division preferences, and assignments.'''
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.Enum("umpire", "admin", name="userrole"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), # pylint: disable=not-callable
        sa.PrimaryKeyConstraint("id"), # pylint: disable=not-callable
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("external_uid", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("division", sa.Enum("rookies", "int_i", "int_ii", name="division"),
                  nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("home_team", sa.String(), nullable=True),
        sa.Column("away_team", sa.String(), nullable=True),
        sa.Column("imported_at", sa.DateTime(timezone=True), server_default=sa.func.now()), # pylint: disable=not-callable
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_uid"),
    )
    op.create_index("ix_games_id", "games", ["id"])

    op.create_table(
        "availability_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_slots_id", "availability_slots", ["id"])

    op.create_table(
        "division_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("division", sa.Enum("rookies", "int_i", "int_ii", name="division"),
                  nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "division"),
    )
    op.create_index("ix_division_preferences_id", "division_preferences", ["id"])

    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("game_id", sa.Integer(), nullable=False),
        sa.Column("umpire_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "accepted", "declined", "expired", name="assignmentstatus"),
            nullable=False,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()), # pylint: disable=not-callable
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notified_admin", sa.Boolean(), default=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["umpire_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assignments_id", "assignments", ["id"])


def downgrade() -> None:
    '''Drop all tables and types created in the upgrade.'''
    op.drop_table("assignments")
    op.drop_table("division_preferences")
    op.drop_table("availability_slots")
    op.drop_table("games")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS division")
    op.execute("DROP TYPE IF EXISTS assignmentstatus")
