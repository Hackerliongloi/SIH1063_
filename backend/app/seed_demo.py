"""Idempotent demo content seed based on publicly linked NCPOR resources.

Run from the backend directory with ``python -m app.seed_demo``. The records
refer to official NCPOR pages and retain source/attribution metadata; this
command does not copy or relicense NCPOR media.
"""
from __future__ import annotations

import logging
from sqlalchemy import select

from .core.db import Base, SessionLocal, engine
from .models import Asset, AssetTag, AssetVersion, Chunk, Draft, Expedition, Tag, User, now
from .modules.feed import FeedItem, OutreachStory, StoryCitation, StorySlide
from .core.config import settings
from .embeddings import embed

log = logging.getLogger("polar.seed_demo")
SOURCE = "https://ncpor.res.in/"
PHOTO_ALBUM = "https://ncps.ncpor.res.in/expedition/pic_gallery.php?album=STATIONS"
VIDEO_CHANNEL = "https://www.youtube.com/channel/UC1h2xM-VmB1opmtTa4IreQQ"

EXPEDITIONS = [
    {"name": "Indian Antarctic Programme", "region": "Antarctica", "stations": ["Maitri", "Bharati", "Dakshin Gangotri"], "description": "NCPOR coordinates India's Antarctic research programme and maintains the Indian research stations. See the official programme pages for current information."},
    {"name": "Indian Arctic Programme", "region": "Arctic", "stations": ["Himadri"], "description": "Polar research and observations in the Arctic, including the Himadri research station."},
    {"name": "Himalayan Cryosphere Programme", "region": "Himalaya", "stations": ["Himansh"], "description": "Research concerning the Himalayan cryosphere and related environmental processes."},
    {"name": "Southern Ocean Research", "region": "Southern Ocean", "stations": [], "description": "Oceanographic and multidisciplinary research in the Southern Ocean."},
    {"name": "International Ocean Discovery Program", "region": "Global Ocean", "stations": [], "description": "India's scientific participation in the International Ocean Discovery Program."},
]

# These are source records, not assertions that the linked material is owned
# by this demo application. Current notices are deliberately linked to NCPOR.
ASSETS = [
    {"key": "photo-maitri", "type": "photo", "title": "Maitri Antarctic research station — official station gallery", "description": "Station photo gallery entry. Open the NCPOR expedition gallery for the source images and captions.", "region": "Antarctica", "station": "Maitri", "expedition": "Indian Antarctic Programme", "url": PHOTO_ALBUM, "tags": ["Maitri", "Antarctica", "station", "photo"], "media_kind": "photo", "source_page": "https://ncps.ncpor.res.in/expedition/maitri.php"},
    {"key": "photo-bharati", "type": "photo", "title": "Bharati Antarctic research station — official station gallery", "description": "Station photo gallery entry. Open the NCPOR expedition gallery for the source images and captions.", "region": "Antarctica", "station": "Bharati", "expedition": "Indian Antarctic Programme", "url": PHOTO_ALBUM, "tags": ["Bharati", "Antarctica", "station", "photo"], "media_kind": "photo", "source_page": "https://ncps.ncpor.res.in/expedition/index.php"},
    {"key": "photo-dakshin-gangotri", "type": "photo", "title": "Dakshin Gangotri — official station gallery", "description": "NCPOR's Antarctic photo gallery includes the first Indian Antarctic station.", "region": "Antarctica", "expedition": "Indian Antarctic Programme", "url": PHOTO_ALBUM, "tags": ["Dakshin Gangotri", "Antarctica", "station", "photo"], "media_kind": "photo", "source_page": "https://ncps.ncpor.res.in/expedition/index.php"},
    {"key": "video-official-channel", "type": "video", "title": "NCPOR official video channel", "description": "Official NCPOR video destination. The channel is linked directly; this record does not invent a video title or embed ID.", "region": "India", "expedition": None, "url": VIDEO_CHANNEL, "tags": ["NCPOR", "video", "outreach"], "media_kind": "video", "source_page": SOURCE},
    {"key": "report-annual-2018-19", "type": "report", "title": "NCPOR Annual Report 2018–2019", "description": "Official annual report covering polar sciences, ocean and geosciences, operations and publications.", "region": "India", "expedition": None, "year": 2019, "url": "https://ncpor.res.in/upload/annualreports/AR%20English.PDF", "tags": ["annual report", "publication", "polar science"], "media_kind": "document", "source_page": "https://ncpor.res.in/annualreports"},
    {"key": "report-antarctic-nomination-44", "type": "report", "title": "Indian Antarctic Expedition: nomination and data policy document", "description": "Official NCPOR expedition document with nomination information and expedition data policy.", "region": "Antarctica", "expedition": "Indian Antarctic Programme", "year": 2024, "url": "https://ncpor.res.in/files/44th_isea_02012024.pdf", "tags": ["Antarctica", "expedition", "data policy", "document"], "media_kind": "document", "source_page": "https://ncpor.res.in/antarcticas"},
    {"key": "report-maitri-ii-tender", "type": "report", "title": "Project Maitri-II: official tender document", "description": "NCPOR tender document concerning the Maitri-II station redevelopment project. Refer to the source for its procurement status and terms.", "region": "Antarctica", "expedition": "Indian Antarctic Programme", "year": 2024, "url": "https://ncpor.res.in/upload/tenders/Maitri-II%20Clarifications_19_08_24.PDF", "tags": ["Maitri", "Maitri-II", "tender", "document"], "media_kind": "document", "source_page": "https://ncpor.res.in/tenders"},
    {"key": "science-sagar-manthan", "type": "publication", "title": "Official launch of research vessel Sagar Manthan", "description": "NCPOR announcement about the vessel launch and its planned ocean research capabilities. Follow the article for current status.", "region": "Indian Ocean", "expedition": None, "url": "https://ncpor.res.in/news/view/1052", "tags": ["Sagar Manthan", "research vessel", "ocean research"], "media_kind": "web_article", "source_page": SOURCE},
    {"key": "science-glacier-lake", "type": "publication", "title": "Unravelling glacier–lake dynamics in the Himalaya", "description": "NCPOR science update. Use the source page for the original article and associated media.", "region": "Himalaya", "expedition": "Himalayan Cryosphere Programme", "url": "https://ncpor.res.in/", "tags": ["glacier", "lake", "Himalaya", "cryosphere"], "media_kind": "web_article", "source_page": SOURCE},
    {"key": "station-maitri", "type": "activity", "title": "Maitri station profile", "description": "Official NCPOR profile: station location, facilities and role in the Indian Antarctic Programme.", "region": "Antarctica", "station": "Maitri", "expedition": "Indian Antarctic Programme", "url": "https://ncps.ncpor.res.in/expedition/maitri.php", "tags": ["Maitri", "station", "Antarctica"], "media_kind": "web_page", "source_page": "https://ncps.ncpor.res.in/expedition/maitri.php"},
    {"key": "data-npdc", "type": "dataset", "title": "National Polar Data Centre portal", "description": "Official NCPOR data portal for polar datasets, station observations and expedition records. Dataset access and policies are controlled by the portal.", "region": "Polar regions", "expedition": None, "url": "https://npdc.ncpor.res.in/", "tags": ["data", "NPDC", "polar observations"], "media_kind": "data_portal", "source_page": "https://npdc.ncpor.res.in/"},
    {"key": "data-weather", "type": "dataset", "title": "Meteorological data from Indian polar stations", "description": "Official station meteorological data portal. Values are live and are not copied into this demo dataset.", "region": "Polar regions", "expedition": None, "url": "https://data.ncpor.res.in/", "tags": ["meteorology", "Maitri", "Bharati", "Himadri", "Himansh"], "media_kind": "data_portal", "source_page": "https://data.ncpor.res.in/"},
    {"key": "permits-antarctic", "type": "activity", "title": "Antarctic environmental permits and application forms", "description": "NCPOR information about permit applications and environmental requirements. Always consult the official page for current forms and rules.", "region": "Antarctica", "expedition": "Indian Antarctic Programme", "url": "https://www.ncpor.res.in/antarcticas/display/443-application-forms-to-obtain-permit", "tags": ["Antarctica", "permit", "environment", "forms"], "media_kind": "web_page", "source_page": "https://ncpor.res.in/antarcticas"},
    {"key": "expedition-updates", "type": "activity", "title": "NCPOR expedition updates", "description": "Official expedition update archive. Historical entries are not represented as current expedition status.", "region": "Polar regions", "expedition": None, "url": "https://www.ncpor.res.in/pages/view/247-expedition-updates", "tags": ["expedition", "updates", "operations"], "media_kind": "web_page", "source_page": SOURCE},
    {"key": "photo-gallery", "type": "photo", "title": "NCPOR photo gallery", "description": "Official NCPOR photo gallery, including institutional and outreach events. Open the source to choose a gallery album.", "region": "India", "expedition": None, "url": "https://ncpor.res.in/photogallery?categoryid=47", "tags": ["photo gallery", "NCPOR", "outreach"], "media_kind": "photo_gallery", "source_page": "https://ncpor.res.in/photogallery?categoryid=47"},
]

def seed() -> dict[str, int]:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == settings.admin_email.lower()))
        expeditions: dict[str, Expedition] = {}
        for entry in EXPEDITIONS:
            row = db.scalar(select(Expedition).where(Expedition.name == entry["name"]))
            if row is None:
                row = Expedition(**entry)
                db.add(row)
                db.flush()
            expeditions[entry["name"]] = row

        inserted_assets = 0
        for item in ASSETS:
            key = item["key"]
            row = db.scalar(select(Asset).where(Asset.metadata_json["demo_key"].as_string() == key))
            if row is not None:
                continue
            metadata = {
                "demo": True,
                "demo_key": key,
                "source_url": item["source_page"],
                "media_url": item["url"],
                "media_kind": item["media_kind"],
                "attribution": "NCPOR / Ministry of Earth Sciences, Government of India (official source link)",
                "usage_note": "Linked to source; media is not copied or relicensed by this demo portal.",
            }
            row = Asset(
                type=item["type"], title=item["title"], description=item["description"],
                expedition_id=expeditions[item["expedition"]].id if item.get("expedition") else None,
                region=item.get("region"), station=item.get("station"), year=item.get("year"), external_url=item["url"],
                status="ready", created_by=admin.id if admin else None, metadata_json=metadata,
            )
            db.add(row)
            db.flush()
            snapshot = {"type": row.type, "title": row.title, "description": row.description,
                        "region": row.region, "station": row.station, "year": row.year, "external_url": row.external_url,
                        "metadata": metadata}
            db.add(AssetVersion(asset_id=row.id, version=1, snapshot_json=snapshot))
            searchable = f"{row.title}. {row.description} Source page: {item['source_page']}"
            db.add(Chunk(asset_id=row.id, idx=0, text=searchable, embedding=embed(searchable)))
            for tag_name in item["tags"]:
                tag = db.scalar(select(Tag).where(Tag.name == tag_name))
                if tag is None:
                    tag = Tag(name=tag_name, kind="theme")
                    db.add(tag)
                    db.flush()
                db.add(AssetTag(asset_id=row.id, tag_id=tag.id))
            inserted_assets += 1

        # Seed a published story and Discover wrappers so a fresh install has
        # visible public content; both remain explicitly labelled demo records.
        story_title = "Demo: Exploring India's polar research programme"
        article_added = False
        if not db.scalar(select(Draft).where(Draft.title == story_title)):
            db.add(Draft(kind="article", title=story_title,
                         body_md=("This is demonstration content assembled from public NCPOR pages. "
                                  "It introduces the Indian Antarctic stations and links readers to "
                                  "NCPOR's official programme, station, photo-gallery and annual-report pages.\n\n"
                                  f"Sources: [NCPOR]({SOURCE}), [Antarctica]({SOURCE}antarcticas), "
                                  f"[station gallery]({PHOTO_ALBUM}), [annual reports]({SOURCE}annualreports).\n\n"
                                  "**Demo content:** this sample story is not an official NCPOR publication."),
                         tone="general_public", status="published",
                         expedition_id=expeditions["Indian Antarctic Programme"].id,
                         created_by=admin.id if admin else None))
            article_added = True

        feed_specs = [
            ("Demo: Maitri and India's Antarctic presence", "post", "photo-maitri", ["Antarctica", "Maitri", "Demo"]),
            ("Demo: Bharati station gallery", "carousel", "photo-bharati", ["Antarctica", "Bharati", "Demo"]),
            ("Demo: NCPOR video channel", "reel", "video-official-channel", ["NCPOR", "Video", "Demo"]),
        ]
        inserted_feed = 0
        for caption, kind, asset_key, hashtags in feed_specs:
            if db.scalar(select(FeedItem).where(FeedItem.caption == caption)):
                continue
            asset = db.scalar(select(Asset).where(Asset.metadata_json["demo_key"].as_string() == asset_key))
            if asset is None:
                continue
            db.add(FeedItem(kind=kind, caption=caption, hashtags=hashtags,
                            expedition_id=asset.expedition_id, primary_asset_id=asset.id,
                            source="staff", status="published", editorial_boost=0.0,
                            published_at=now(),
                            created_by=admin.id if admin else None))
            inserted_feed += 1
        story_title_public = "Demo: Maitri station source card"
        story_added = False
        if not db.scalar(select(OutreachStory).where(OutreachStory.title == story_title_public)):
            source_asset = db.scalar(select(Asset).where(Asset.metadata_json["demo_key"].as_string() == "station-maitri"))
            source_chunk = db.scalar(select(Chunk).where(Chunk.asset_id == source_asset.id).order_by(Chunk.idx)) if source_asset else None
            if source_asset and source_chunk:
                story = OutreachStory(title=story_title_public,
                                      summary="A demonstration Story linked to NCPOR's public Maitri station profile.",
                                      status="published", expedition_id=source_asset.expedition_id,
                                      region=source_asset.region, station=source_asset.station,
                                      created_by=admin.id if admin else None, published_at=now())
                db.add(story);db.flush()
                slide=StorySlide(story_id=story.id,position=0,kind="text",title="Open the station source",
                                 body=source_asset.description,alt_text="Demo Story; open the linked NCPOR source for details.")
                db.add(slide);db.flush()
                db.add(StoryCitation(story_id=story.id,slide_id=slide.id,asset_id=source_asset.id,
                                     chunk_id=source_chunk.id,claim_text=source_asset.description,
                                     span_text=source_asset.description,label=source_asset.title,supported=True))
                story_added=True
        db.commit()
        return {"expeditions": len(expeditions), "assets_added": inserted_assets,
                "feed_items_added": inserted_feed, "article_added": int(article_added),
                "outreach_story_added": int(story_added)}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    print(seed())
