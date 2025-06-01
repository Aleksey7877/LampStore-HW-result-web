from sqlalchemy.orm import Session
from models import AdminUser

def get_admin_user_by_username(db: Session, username: str):
    return db.query(AdminUser).filter(AdminUser.username == username).first()
