import sys
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.models import Asset

# Use the same connection string format as backend/app/core/db.py
engine = create_engine('postgresql+psycopg://polar:polar-local-password@127.0.0.1:5432/polar')

with Session(engine) as db:
    photos = db.scalars(select(Asset).where(Asset.type == "photo")).all()
    if not photos:
        print("No photos found in database.")
        sys.exit(0)
    
    # Just assign a placeholder unsplash image to any photo that doesn't have one
    # Note: next.config.ts allows images.unsplash.com
    dummy_images = [
        "https://images.unsplash.com/photo-1518776859345-42358cb61921", # Antarctica landscape
        "https://images.unsplash.com/photo-1596706037142-83bc8d55c707", # penguins
        "https://images.unsplash.com/photo-1582845512747-e42001c95638", # ice
    ]
    
    for i, p in enumerate(photos):
        if not p.thumb_key:
            p.thumb_key = dummy_images[i % len(dummy_images)]
            print(f"Updated photo {p.id} with thumb_key")
    
    db.commit()
    print("Database updated with dummy images!")
