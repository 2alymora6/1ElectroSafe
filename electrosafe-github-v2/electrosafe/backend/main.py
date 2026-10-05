"""ElectroSafe - servidor (API) en Python con FastAPI.

Archivos del backend:
    main.py         arma la aplicación y une las partes (este archivo)
    db.py           conexión a la base de datos (Neon/PostgreSQL o SQLite local)
    models.py       tablas de la base de datos
    crud.py         operaciones básicas (listar, crear, editar, borrar) para cada tabla
    checklists.py   inspecciones con sus ítems
    indicadores.py  MTBF, MTTR, disponibilidad y cumplimiento
    asistente.py    asistente de IA (RAG) y manejo de documentos
"""
from dotenv import load_dotenv

load_dotenv()  # debe ir antes de importar db.py, que lee DATABASE_URL

import os  # noqa: E402

from fastapi import Depends, FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from sqlalchemy import func, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import asistente  # noqa: E402
import checklists  # noqa: E402
import indicadores  # noqa: E402
from crud import crear_router  # noqa: E402
from db import Base, SessionLocal, engine, get_db  # noqa: E402
from models import (  # noqa: E402
    ChecklistPlantilla, Documento, Equipo, Faq, Fragmento, Inventario, Mantenimiento,
    Normativa, PeriodoOperativo, Protocolo, Resultado, Riesgo, Usuario,
)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")
    if o.strip()
]

# Tabla, ruta y campos obligatorios
TABLAS = [
    (Equipo, "/equipos", ("marca", "modelo")),
    (Inventario, "/inventario", ("nombre",)),
    (Mantenimiento, "/mantenimientos", ("fecha", "tipo", "responsable")),
    (PeriodoOperativo, "/periodos", ("nombre",)),
    (Resultado, "/resultados", ("fecha", "prueba", "valor", "unidad")),
    (ChecklistPlantilla, "/plantilla-checklist", ("descripcion",)),
    (Riesgo, "/riesgos", ("tipo",)),
    (Normativa, "/normativas", ("nombre",)),
    (Protocolo, "/protocolos", ("titulo",)),
    (Faq, "/faq", ("pregunta",)),
    (Usuario, "/usuarios", ("nombre", "correo", "rol")),
]

app = FastAPI(title="ElectroSafe")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for Tabla, ruta, requeridos in TABLAS:
    app.include_router(crear_router(Tabla, ruta, requeridos))
app.include_router(checklists.router)
app.include_router(indicadores.router)
app.include_router(asistente.router)


def preparar_base():
    """Crea las tablas si no existen y deja registrado el equipo del proyecto."""
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count(Equipo.id))) == 0:
            db.add(Equipo(marca="Valleylab", modelo="Force FX-C", fabricante="Medtronic / Covidien"))
            db.commit()


preparar_base()


@app.get("/salud")
def salud(db: Session = Depends(get_db)):
    prov = asistente.proveedor()
    return {
        "estado": "ok",
        "base_datos": engine.dialect.name,  # "postgresql" = Neon, "sqlite" = archivo local
        "documentos": db.scalar(select(func.count(Documento.id))),
        "fragmentos": db.scalar(select(func.count(Fragmento.id))),
        "modelo_configurado": bool(prov),
        "proveedor": prov,
    }
