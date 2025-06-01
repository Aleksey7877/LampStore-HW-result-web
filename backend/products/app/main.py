from fastapi import FastAPI, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from .auth_utils import get_current_admin_user
from fastapi import Security
from .database import SessionLocal, init_db
from . import models, schemas, crud
from .kafka_producer import send_kafka_event
from .kafka_setup import create_kafka_topic
from .kafka_consumer import start_consumer
from threading import Thread
from .grpc_server import serve as start_grpc_server
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt


SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"

app = FastAPI(title="Products Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8083"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8003/token")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    send_kafka_event("products", {"action": "warmup"})
    init_db()
    create_kafka_topic("products")
    start_consumer()
    Thread(target=start_grpc_server, daemon=True).start()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/products", response_model=list[schemas.Product])
def read_products(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") == "admin":
            products = crud.get_products(db, only_active=False)
        else:
            products = crud.get_products(db, only_active=True)
    except JWTError:
        products = crud.get_products(db, only_active=True)

    return [schemas.Product.from_orm(p) for p in products]


@app.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return schemas.Product.from_orm(product)

@app.post("/products", response_model=schemas.Product, status_code=201)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    try:
        db_obj = crud.create_product(db, product_in)
        product_schema = schemas.Product.from_orm(db_obj)
        send_kafka_event("products", {'action': 'create', 'product': product_schema.dict()})
        return product_schema
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/products/{product_id}", response_model=schemas.Product)
def replace_product(product_id: int, product_in: schemas.ProductCreate, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    updated = crud.update_product(db, product_id, schemas.ProductUpdate(**product_in.dict()))
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    product_schema = schemas.Product.from_orm(updated)
    send_kafka_event("products", {'action': 'update', 'product': product_schema.dict()})
    return product_schema

@app.patch("/products/{product_id}", response_model=schemas.Product)
def patch_product(product_id: int, product_in: schemas.ProductUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    updated = crud.update_product(db, product_id, product_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    product_schema = schemas.Product.from_orm(updated)
    send_kafka_event("products", {'action': 'update', 'product': product_schema.dict()})
    return product_schema


@app.delete("/products/{product_id}", response_model=schemas.Product)
def delete_product(product_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    deleted = crud.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    send_kafka_event("products", {'action': 'delete', 'product_id': product_id})
    return schemas.Product.from_orm(deleted)