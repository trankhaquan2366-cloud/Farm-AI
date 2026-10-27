import re
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.notification import Notification
from app.models.plot import Plot

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
@router.get("/")
def get_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).limit(20).all()
    
    result = []
    for noti in notifications:
        message = noti.message or ""
        
        # Tìm số ID đằng sau chữ "Lô " (Ví dụ: "Lô 5: phát hiện...")
        match = re.search(r'Lô\s+(\d+)', message)
        if match:
            plot_id = int(match.group(1))
            # Tra cứu tên lô đất từ ID
            plot = db.query(Plot).filter(Plot.id == plot_id).first()
            if plot and plot.name:
                # Thay thế "Lô 5" thành tên thực tế "chỉ chỉ"
                message = re.sub(r'Lô\s+\d+', plot.name, message)

        # Format thời gian
        time_str = ""
        if hasattr(noti, "created_at") and noti.created_at:
            if isinstance(noti.created_at, datetime):
                time_str = noti.created_at.strftime("%H:%M:%S %d/%m/%Y")
            else:
                time_str = str(noti.created_at)

        result.append({
            "id": noti.id,
            "type": getattr(noti, "type", "warning"),
            "title": noti.title,
            "message": message,
            "time": time_str,
            "unread": not getattr(noti, "is_read", False)
        })

    return result