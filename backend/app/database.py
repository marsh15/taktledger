import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(PROJECT_DIR / ".env", override=False)

DEFAULT_DATABASE_PATH = BASE_DIR / "taktledger.db"


def resolve_database_url(url: str | None) -> str:
    if not url:
        return f"sqlite:///{DEFAULT_DATABASE_PATH}"
    if not url.startswith("sqlite:///") or url == "sqlite:///:memory:":
        return url

    path_part = url.removeprefix("sqlite:///")
    database_path = Path(path_part)
    if database_path.is_absolute():
        return url

    return f"sqlite:///{BASE_DIR / database_path}"


DATABASE_URL = resolve_database_url(os.getenv("DATABASE_URL"))

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
