"""Small admin CLI. Usage: python -m app.cli create-admin EMAIL"""
import argparse

from app.db.session import SessionLocal
from app.models.user import User


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
    args = parser.parse_args()
    set_role(args.email, "admin" if args.cmd == "create-admin" else "user")


if __name__ == "__main__":
    main()
