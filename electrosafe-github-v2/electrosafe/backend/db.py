"""Conexión a la base de datos.

- Con DATABASE_URL (Neon / PostgreSQL) los datos quedan guardados de forma permanente.
- Sin DATABASE_URL se usa un archivo SQLite local (solo para desarrollo y pruebas).
"""
import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker


def _url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return "sqlite:///" + os.getenv("DB_PATH", "electrosafe.db")
    # Neon entrega "postgresql://..."; SQLAlchemy necesita indicar el driver (psycopg)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


URL = _url()
es_sqlite = URL.startswith("sqlite")
engine = create_engine(
    URL,
    pool_pre_ping=True,  # Neon duerme la base si no se usa: reabre la conexión si hace falta
    connect_args={"check_same_thread": False} if es_sqlite else {},
)

if es_sqlite:

    @event.listens_for(engine, "connect")
    def _activar_claves_foraneas(conexion, _):
        conexion.execute("PRAGMA foreign_keys=ON")


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


def get_db():
    """Abre una sesión por petición y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
