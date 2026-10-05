"""Indicadores del dashboard, calculados con los registros guardados (no se escriben a mano).

  Fallas        = mantenimientos Correctivos que caen dentro de un período operativo
  MTBF          = horas operativas totales ÷ número de fallas
  MTTR          = horas de parada de esos correctivos ÷ número de fallas
  Disponibilidad = MTBF ÷ (MTBF + MTTR) × 100
  Cumplimiento  = mantenimientos Completados ÷ mantenimientos registrados × 100
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from db import get_db
from models import Equipo, Mantenimiento, PeriodoOperativo

router = APIRouter(tags=["indicadores"])


def _en_algun_periodo(fecha: str, periodos) -> bool:
    return any(p.fecha_inicio <= fecha <= p.fecha_fin for p in periodos if p.fecha_inicio and p.fecha_fin)


@router.get("/indicadores")
def indicadores(equipo_id: int | None = None, db: Session = Depends(get_db)):
    q_mant, q_per = select(Mantenimiento), select(PeriodoOperativo)
    if equipo_id is not None:
        q_mant = q_mant.where(Mantenimiento.equipo_id == equipo_id)
        q_per = q_per.where(PeriodoOperativo.equipo_id == equipo_id)
    mantenimientos, periodos = list(db.scalars(q_mant)), list(db.scalars(q_per))

    horas_operativas = sum(p.horas_operativas or 0 for p in periodos)
    fallas = [m for m in mantenimientos if m.tipo == "Correctivo" and _en_algun_periodo(m.fecha, periodos)]
    horas_reparacion = sum(m.horas_parada or 0 for m in fallas)

    mtbf = horas_operativas / len(fallas) if fallas else None
    mttr = horas_reparacion / len(fallas) if fallas else None
    disponibilidad = 100 * mtbf / (mtbf + mttr) if mtbf is not None and (mtbf + mttr) > 0 else None

    completados = sum(1 for m in mantenimientos if m.estado == "Completado")
    cumplimiento = 100 * completados / len(mantenimientos) if mantenimientos else None

    dias_proximo = None
    equipo = db.get(Equipo, equipo_id) if equipo_id is not None else db.scalars(select(Equipo)).first()
    if equipo and equipo.proximo_mantenimiento:
        try:
            dias_proximo = (date.fromisoformat(equipo.proximo_mantenimiento) - date.today()).days
        except ValueError:
            pass

    return {
        "mtbf_horas": mtbf,
        "mttr_horas": mttr,
        "disponibilidad_pct": disponibilidad,
        "cumplimiento_pct": cumplimiento,
        "dias_para_proximo_mantenimiento": dias_proximo,
        "detalle": {
            "horas_operativas": horas_operativas,
            "fallas": len(fallas),
            "horas_reparacion": horas_reparacion,
            "mantenimientos_registrados": len(mantenimientos),
            "mantenimientos_completados": completados,
        },
    }
