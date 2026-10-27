from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db

router = APIRouter(prefix="/api/v1/seeds", tags=["Seeds - Giống cây"])

@router.get("/", response_model=List[schemas.SeedResponse])
def get_all_seeds(db: Session = Depends(get_db)):
    return db.query(models.Seed).all()

@router.post("/", response_model=schemas.SeedResponse, status_code=status.HTTP_201_CREATED)
def create_seed(seed: schemas.SeedCreate, db: Session = Depends(get_db)):
    new_seed = models.Seed(**seed.model_dump())
    db.add(new_seed)
    db.commit()
    db.refresh(new_seed)
    return new_seed