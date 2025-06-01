from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session




oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8003/token")

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"


def get_current_admin_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

