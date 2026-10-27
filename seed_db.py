from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.plot import Plot
from app.models.plant_variety import PlantVariety

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Tạo user
    user = User(username="admin", password_hash="hashed_pwd", full_name="Admin", role="quan_ly")
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✓ Created user: {user.id}")

    # Tạo plot (lô đất)
    plot = Plot(name="Lô đất 1", area_m2=1000, location="Khu A", soil_type="đất tốt")
    db.add(plot)
    db.commit()
    db.refresh(plot)
    print(f"✓ Created plot: {plot.id}")

    # Tạo plant variety (giống cây)
    variety = PlantVariety(name="Bập cải", growth_duration_days=45, category="Rau lá")
    db.add(variety)
    db.commit()
    db.refresh(variety)
    print(f"✓ Created variety: {variety.id}")

    print("\n✓ Database seeding complete!")
finally:
    db.close()
