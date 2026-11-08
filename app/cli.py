"""Small admin CLI. Usage: python -m app.cli create-admin EMAIL | purge-expired"""
import argparse

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.services.cleanup import run_cleanup_once


def set_role(email: str, role: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise SystemExit(f"No user with email {email}. Register (or sign in with Google) first.")
        user.role = role
        db.commit()
        print(f"{email} is now {role}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("create-admin", help="promote a user to admin").add_argument("email")
    sub.add_parser("remove-admin", help="demote an admin to user").add_argument("email")
    sub.add_parser("purge-expired", help="delete links that expired past the retention period")
    args = parser.parse_args()
    if args.cmd == "purge-expired":
        deleted = run_cleanup_once()
        print(f"deleted {deleted} link(s) expired more than {settings.EXPIRED_LINK_RETENTION_DAYS} days ago")
        return
    set_role(args.email, "admin" if args.cmd == "create-admin" else "user")


if __name__ == "__main__":
    main()
