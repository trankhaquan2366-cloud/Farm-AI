from sqlalchemy.orm import Session
from app.models.ai_suggestion import AiSuggestion


def create(db: Session, suggestion_type: str, batch_id, input_data: str,
           output_text: str, disclaimer: str, created_at) -> AiSuggestion:
    db_obj = AiSuggestion(
        suggestion_type=suggestion_type, batch_id=batch_id, input_data=input_data,
        output_text=output_text, disclaimer=disclaimer, created_at=created_at,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_by_batch(db: Session, batch_id: int):
    return db.query(AiSuggestion).filter(AiSuggestion.batch_id == batch_id).order_by(AiSuggestion.created_at.desc()).all()
