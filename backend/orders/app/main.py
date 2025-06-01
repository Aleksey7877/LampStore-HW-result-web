from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import SessionLocal, init_db
from .kafka_producer import send_kafka_event
from .kafka_consumer import start_kafka_consumer
from sqlalchemy.orm import joinedload
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi import Security
from .auth_utils import get_current_admin_user


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8003/token")

app = FastAPI(title="Orders Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8083"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    start_kafka_consumer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/orders", response_model=list[schemas.Order])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return [schemas.Order.from_orm(order) for order in orders]


@app.get("/orders/{order_id}", response_model=schemas.Order)
def read_order(order_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return schemas.Order.from_orm(order)



@app.post("/orders", response_model=schemas.Order, status_code=201)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    try:
        db_obj = crud.create_order(db, order_in)
        order_schema = schemas.Order.from_orm(db_obj)
        send_kafka_event("orders", {
            "action": "create",
            "order_id": order_schema.id,
            "payload": order_schema.dict()
        })
        return order_schema
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print("ERROR IN /orders POST")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/orders/{order_id}", response_model=schemas.Order)
def replace_order(order_id: int, order_in: schemas.OrderUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    updated = crud.update_order(db, order_id, order_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    order_schema = schemas.Order.from_orm(updated)
    send_kafka_event("orders", {"action": "update",
                     "order": order_schema.dict()})
    return order_schema


@app.patch("/orders/{order_id}", response_model=schemas.Order)
def patch_order(order_id: int, order_in: schemas.OrderUpdate, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    updated = crud.update_order(db, order_id, order_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    order_schema = schemas.Order.from_orm(updated)
    send_kafka_event("orders", {"action": "update",
                     "order": order_schema.dict()})
    return order_schema


@app.delete("/orders/{order_id}", response_model=schemas.Order)
def delete_order(order_id: int, db: Session = Depends(get_db), _: str = Depends(get_current_admin_user)):
    order = db.query(models.Order).options(
        joinedload(models.Order.customer),
        joinedload(models.Order.items),
        joinedload(models.Order.status)
    ).filter(models.Order.id == order_id).first()

    if not order:
        return None

    order_data = order

    db.delete(order)
    db.commit()

    return order_data


@app.post("/customers", response_model=schemas.Customer, status_code=201)
def create_customer(customer_in: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db, customer_in)


@app.get("/customers", response_model=list[schemas.Customer])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip, limit)


@app.get("/customers/{customer_id}", response_model=schemas.Customer)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, customer_in: schemas.CustomerCreate, db: Session = Depends(get_db)):
    updated = crud.update_customer(db, customer_id, customer_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated


