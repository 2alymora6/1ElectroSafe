"""Checklists: una inspección con sus ítems evaluados (se guardan juntos)."""
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db
from models import Checklist, ChecklistItem

router = APIRouter(prefix="/checklists", tags=["checklists"])


class ItemIn(BaseModel):
    plantilla_id: int | None = None
    descripcion: str = ""
    evaluacion: str = ""  # Cumple / No cumple / Observación
    observacion: str = ""
    foto: str = ""


class ChecklistIn(BaseModel):
    equipo_id: int | None = None
    fecha: str
    responsable: str
    items: list[ItemIn] = []


def _a_dict(c: Checklist) -> dict:
    return {
        "id": c.id,
        "equipo_id": c.equipo_id,
        "fecha": c.fecha,
        "responsable": c.responsable,
        "items": [
            {
                "id": i.id,
                "plantilla_id": i.plantilla_id,
                "descripcion": i.descripcion,
                "evaluacion": i.evaluacion,
                "observacion": i.observacion,
                "foto": i.foto,
            }
            for i in c.items
        ],
    }


def _items(datos: ChecklistIn) -> list[ChecklistItem]:
    return [ChecklistItem(**i.model_dump()) for i in datos.items]


def _confirmar(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Referencia inválida (equipo o ítem de plantilla inexistente).")


def _buscar(db: Session, checklist_id: int) -> Checklist:
    c = db.get(Checklist, checklist_id)
    if c is None:
        raise HTTPException(404, "Checklist no encontrado.")
    return c


@router.get("")
def listar(equipo_id: int | None = None, db: Session = Depends(get_db)):
    consulta = select(Checklist).order_by(Checklist.id)
    if equipo_id is not None:
        consulta = consulta.where(Checklist.equipo_id == equipo_id)
    return [_a_dict(c) for c in db.scalars(consulta)]


@router.post("", status_code=201)
def crear(datos: ChecklistIn, db: Session = Depends(get_db)):
    c = Checklist(equipo_id=datos.equipo_id, fecha=datos.fecha, responsable=datos.responsable)
    c.items = _items(datos)
    db.add(c)
    _confirmar(db)
    return _a_dict(c)


@router.get("/{checklist_id}")
def ver(checklist_id: int, db: Session = Depends(get_db)):
    return _a_dict(_buscar(db, checklist_id))


@router.put("/{checklist_id}")
def editar(checklist_id: int, datos: ChecklistIn, db: Session = Depends(get_db)):
    c = _buscar(db, checklist_id)
    c.equipo_id, c.fecha, c.responsable = datos.equipo_id, datos.fecha, datos.responsable
    c.items = _items(datos)  # reemplaza los ítems anteriores
    _confirmar(db)
    return _a_dict(c)


@router.delete("/{checklist_id}", status_code=204)
def borrar(checklist_id: int, db: Session = Depends(get_db)):
    db.delete(_buscar(db, checklist_id))
    _confirmar(db)
    return Response(status_code=204)
