from sqlalchemy.orm import Session
from app.models.plot import Plot
from app.schemas.plot import PlotCreate, PlotUpdate


def get_all(db: Session):
    return db.query(Plot).all()


def get_by_id(db: Session, plot_id: int):
    return db.query(Plot).filter(Plot.id == plot_id).first()


def create(db: Session, data: PlotCreate):
    plot_data = data.model_dump()

    # 1. Chuyển đổi area_m2 sang area nếu có
    if "area_m2" in plot_data:
        plot_data["area"] = plot_data.pop("area_m2")

    # 2. BỘ LỌC AN TOÀN: Chỉ lấy những trường THỰC SỰ CÓ trong bảng Plot
    valid_columns = {col.name for col in Plot.__table__.columns}
    filtered_data = {k: v for k, v in plot_data.items() if k in valid_columns}

    db_obj = Plot(**filtered_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update(db: Session, db_obj: Plot, data: PlotUpdate) -> Plot:
    update_data = data.model_dump(exclude_unset=True)

    if "area_m2" in update_data:
        update_data["area"] = update_data.pop("area_m2")

    valid_columns = {col.name for col in Plot.__table__.columns}
    
    for field, value in update_data.items():
        if field in valid_columns:
            setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete(db: Session, plot_id: int):
    db_obj = db.query(Plot).filter(Plot.id == plot_id).first()
    
    if db_obj:
        db.delete(db_obj)
        db.commit()
        # Đã XÓA db.refresh(db_obj) ở đây để tránh crash
        return db_obj
    return None