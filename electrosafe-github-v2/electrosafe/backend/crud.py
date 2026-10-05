"""CRUD genérico.

crear_router(Tabla, "/ruta") genera automáticamente las operaciones básicas:
    GET    /ruta            lista (admite filtros, p. ej. /ruta?equipo_id=1)
    GET    /ruta/{id}       un registro
    POST   /ruta            crea
    PUT    /ruta/{id}       edita
    DELETE /ruta/{id}       borra
    POST   /ruta/importar   carga varios registros de una vez (modo=agregar o reemplazar)
Así no se repite el mismo código para cada tabla.
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from sqlalchemy import Float, Integer, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db


def _convertir(columna, valor):
    """El navegador envía todo como texto: convierte según el tipo de la columna."""
    if isinstance(columna.type, (Integer, Float)):
        if valor is None or (isinstance(valor, str) and not valor.strip()):
            return None
        try:
            return int(float(valor)) if isinstance(columna.type, Integer) else float(valor)
        except (TypeError, ValueError):
            raise HTTPException(422, f"El campo '{columna.name}' debe ser un número.")
    return "" if valor is None else str(valor)


def crear_router(Tabla, prefijo: str, requeridos: tuple = ()) -> APIRouter:
    router = APIRouter(prefix=prefijo, tags=[prefijo.strip("/")])
    columnas = {c.name: c for c in Tabla.__table__.columns if c.name != "id"}

    def a_dict(obj) -> dict:
        return {c.name: getattr(obj, c.name) for c in Tabla.__table__.columns}

    def limpiar(datos, parcial: bool = False) -> dict:
        if not isinstance(datos, dict):
            raise HTTPException(422, "Se esperaba un objeto JSON.")
        limpio = {n: _convertir(columnas[n], v) for n, v in datos.items() if n in columnas}
        if not parcial:
            faltan = [r for r in requeridos if limpio.get(r) in (None, "")]
            if faltan:
                raise HTTPException(422, f"Faltan campos obligatorios: {', '.join(faltan)}")
        return limpio

    def confirmar(db: Session):
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(400, "Referencia inválida (por ejemplo, un equipo que no existe).")

    def buscar(db: Session, item_id: int):
        obj = db.get(Tabla, item_id)
        if obj is None:
            raise HTTPException(404, "Registro no encontrado.")
        return obj

    @router.get("")
    def listar(request: Request, db: Session = Depends(get_db)):
        consulta = select(Tabla)
        for nombre, valor in request.query_params.items():  # filtros: ?equipo_id=1
            if nombre in columnas:
                consulta = consulta.where(getattr(Tabla, nombre) == _convertir(columnas[nombre], valor))
        return [a_dict(o) for o in db.scalars(consulta.order_by(Tabla.id))]

    @router.post("", status_code=201)
    def crear(datos: dict = Body(...), db: Session = Depends(get_db)):
        obj = Tabla(**limpiar(datos))
        db.add(obj)
        confirmar(db)
        return a_dict(obj)

    @router.post("/importar")
    def importar(filas: list[dict] = Body(...), modo: str = "agregar", db: Session = Depends(get_db)):
        if modo not in ("agregar", "reemplazar"):
            raise HTTPException(422, "modo debe ser 'agregar' o 'reemplazar'.")
        nuevos = [Tabla(**limpiar(f)) for f in filas]  # valida todo antes de borrar nada
        if modo == "reemplazar":
            db.execute(delete(Tabla))
        db.add_all(nuevos)
        confirmar(db)
        return {"importados": len(nuevos), "modo": modo}

    @router.get("/{item_id}")
    def ver(item_id: int, db: Session = Depends(get_db)):
        return a_dict(buscar(db, item_id))

    @router.put("/{item_id}")
    def editar(item_id: int, datos: dict = Body(...), db: Session = Depends(get_db)):
        obj = buscar(db, item_id)
        for nombre, valor in limpiar(datos, parcial=True).items():
            setattr(obj, nombre, valor)
        confirmar(db)
        return a_dict(obj)

    @router.delete("/{item_id}", status_code=204)
    def borrar(item_id: int, db: Session = Depends(get_db)):
        db.delete(buscar(db, item_id))
        confirmar(db)
        return Response(status_code=204)

    return router
