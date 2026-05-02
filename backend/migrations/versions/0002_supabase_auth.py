"""add supabase_id, make password_hash nullable

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("supabase_id", sa.String(), nullable=True))
    op.create_index("ix_users_supabase_id", "users", ["supabase_id"], unique=True)
    op.alter_column("users", "password_hash", nullable=True)


def downgrade() -> None:
    # Backfill NULL password_hash values before restoring NOT NULL constraint
    op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", nullable=False)
    op.drop_index("ix_users_supabase_id", table_name="users")
    op.drop_column("users", "supabase_id")
