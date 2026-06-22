import os
import sys
import uuid

# Set import path context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings

# Force disable mock mode temporarily to build real vectors if API keys exist
# (Or handle gracefully if keys are missing)
from backend.database.session import SessionLocal, engine, Base
from backend.database.models import DBDocument
from backend.services.rag_service import process_and_index_document

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if database is already seeded
        doc_count = db.query(DBDocument).count()
        if doc_count > 0:
            print("Database already contains seeded documents. Skipping seeding.")
            return

        seed_files = [
            {
                "file": "college_handbook.md",
                "title": "College Student Handbook 2026",
                "category": "Handbook"
            },
            {
                "file": "academic_calendar.md",
                "title": "Academic Calendar Schedule 2026",
                "category": "Calendar"
            },
            {
                "file": "placement_guidelines.md",
                "title": "Placement Cell Guidelines",
                "category": "Placement"
            },
            {
                "file": "library_rules.md",
                "title": "Library Rules & Regulations",
                "category": "Rules"
            },
            {
                "file": "os_notes.md",
                "title": "Operating Systems - CPU Scheduling Notes",
                "category": "Notes"
            },
            {
                "file": "dsa_notes.md",
                "title": "Data Structures & Algorithms Notes",
                "category": "Notes"
            }
        ]

        seed_dir = os.path.join(os.path.dirname(__file__), "seed_data")
        
        print("Starting seed indexing process...")
        for item in seed_files:
            file_path = os.path.join(seed_dir, item["file"])
            if not os.path.exists(file_path):
                print(f"Warning: Seed file not found at {file_path}. Skipping.")
                continue

            doc_id = str(uuid.uuid4())
            print(f"Indexing {item['file']} -> '{item['title']}'...")
            
            try:
                success = process_and_index_document(
                    db=db,
                    file_path=file_path,
                    doc_id=doc_id,
                    filename=item["file"],
                    title=item["title"],
                    category=item["category"],
                    uploaded_by="System Seed"
                )
                if success:
                    print(f"Successfully seeded: {item['file']}")
                else:
                    print(f"Failed to seed: {item['file']}")
            except Exception as e:
                print(f"Error seeding {item['file']}: {str(e)}")
                
        print("Database seeding completed.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
