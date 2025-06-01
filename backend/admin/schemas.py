from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class AdminUserInDB(BaseModel):
    username: str
    hashed_password: str

class AdminLogin(BaseModel):
    username: str
    password: str
