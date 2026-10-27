from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class AiSuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    suggestion_type = Column(String, nullable=False)  # schedule | summary | alert
    batch_id = Column(Integer, ForeignKey("crop_batches.id"), nullable=True)
    input_data = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)
    disclaimer = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
