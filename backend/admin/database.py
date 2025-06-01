import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, AdminUser
from sqlalchemy.orm import Session
from fastapi import Depends

DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://admin:adminpass@postgres-admin:5432/admindb")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from auth import hash_password
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if not db.query(AdminUser).filter_by(username="admin").first():
            admin = AdminUser(
                username="admin",
                hashed_password=hash_password("admin")
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
