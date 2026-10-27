from sqlalchemy.orm import Session
from app.models.plant_variety import PlantVariety
from app.schemas.plant_variety import PlantVarietyCreate, PlantVarietyUpdate


def get_all(db: Session):
    return db.query(PlantVariety).all()


def get_by_id(db: Session, variety_id: int):
    return db.query(PlantVariety).filter(PlantVariety.id == variety_id).first()


def create(db: Session, data: PlantVarietyCreate) -> PlantVariety:
    # **data.model_dump() "bung" các trường của schema thành tham số của Model
    db_obj = PlantVariety(**data.model_dump())
    db.add(db_obj)       # đưa object vào "hàng đợi" thay đổi
    db.commit()          # ghi thật xuống file farm.db
    db.refresh(db_obj)   # đọc lại để lấy id vừa được CSDL tự sinh
    return db_obj


def update(db: Session, db_obj: PlantVariety, data: PlantVarietyUpdate) -> PlantVariety:
    # exclude_unset=True: chỉ lấy những trường client thực sự gửi lên,
    # tránh việc ghi đè các trường khác thành None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, db_obj: PlantVariety) -> None:
    db.delete(db_obj)
    db.commit()
