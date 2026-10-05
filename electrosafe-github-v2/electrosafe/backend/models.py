"""Tablas de la base de datos de ElectroSafe.

Cada clase es una tabla. Parte del diseño de base de datos del primer corte
(USUARIO, EQUIPO, NORMATIVA, MANTENIMIENTO, RIESGO, DOCUMENTO) y agrega las
tablas que necesita la aplicación completa.
"""
from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from db import Base


def _fk_equipo():
    return Column(Integer, ForeignKey("equipos.id", ondelete="CASCADE"))


# ----------------------------------------------------------- datos del equipo
class Equipo(Base):
    __tablename__ = "equipos"
    id = Column(Integer, primary_key=True)
    marca = Column(String, default="")
    modelo = Column(String, default="")
    fabricante = Column(String, default="")
    serie = Column(String, default="")
    anio = Column(Integer)
    ubicacion = Column(String, default="")
    estado = Column(String, default="")
    fecha_adquisicion = Column(String, default="")  # fechas como texto AAAA-MM-DD
    proximo_mantenimiento = Column(String, default="")
    foto = Column(Text, default="")  # imagen en base64


class Inventario(Base):
    __tablename__ = "inventario"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    nombre = Column(String, default="")
    categoria = Column(String, default="")
    referencia = Column(String, default="")
    cantidad = Column(Integer)
    estado = Column(String, default="")
    foto = Column(Text, default="")


class Mantenimiento(Base):
    __tablename__ = "mantenimientos"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    fecha = Column(String, default="")
    tipo = Column(String, default="")  # Preventivo / Correctivo / Predictivo
    responsable = Column(String, default="")
    actividades = Column(Text, default="")
    resultado = Column(Text, default="")
    horas_parada = Column(Float)
    estado = Column(String, default="")  # Pendiente / En proceso / Completado
    evidencia = Column(Text, default="")


class PeriodoOperativo(Base):
    """Horas en que el equipo estuvo disponible para operar (base del MTBF)."""

    __tablename__ = "periodos_operativos"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    nombre = Column(String, default="")
    fecha_inicio = Column(String, default="")
    fecha_fin = Column(String, default="")
    horas_operativas = Column(Float)


class Resultado(Base):
    __tablename__ = "resultados"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    fecha = Column(String, default="")
    prueba = Column(String, default="")
    valor = Column(Float)
    unidad = Column(String, default="")
    responsable = Column(String, default="")
    interpretacion = Column(Text, default="")
    evidencia = Column(Text, default="")


# ------------------------------------------------------------------ checklists
class ChecklistPlantilla(Base):
    """Lista de ítems a revisar. La entrega el equipo y se carga/reemplaza sin tocar el código."""

    __tablename__ = "checklist_plantilla"
    id = Column(Integer, primary_key=True)
    orden = Column(Integer)
    categoria = Column(String, default="")
    descripcion = Column(Text, default="")
    criterio = Column(String, default="")  # valor límite o criterio de aceptación
    fuente = Column(String, default="")  # documento y página de donde sale


class Checklist(Base):
    __tablename__ = "checklists"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    fecha = Column(String, default="")
    responsable = Column(String, default="")
    items = relationship(
        "ChecklistItem", cascade="all, delete-orphan", passive_deletes=True, order_by="ChecklistItem.id"
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id = Column(Integer, primary_key=True)
    checklist_id = Column(Integer, ForeignKey("checklists.id", ondelete="CASCADE"), nullable=False)
    plantilla_id = Column(Integer, ForeignKey("checklist_plantilla.id", ondelete="SET NULL"))
    descripcion = Column(Text, default="")  # copia del texto, para que el historial no cambie
    evaluacion = Column(String, default="")  # Cumple / No cumple / Observación
    observacion = Column(Text, default="")
    foto = Column(Text, default="")


# ---------------------------------------------- información que entrega el equipo
class Riesgo(Base):
    __tablename__ = "riesgos"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    tipo = Column(String, default="")
    causa = Column(Text, default="")
    consecuencia = Column(Text, default="")
    severidad = Column(Integer)  # 1 a 5, pendiente de la matriz ISO 14971
    probabilidad = Column(Integer)
    control = Column(Text, default="")
    estado = Column(String, default="Pendiente de información")


class Normativa(Base):
    __tablename__ = "normativas"
    id = Column(Integer, primary_key=True)
    nombre = Column(String, default="")
    tipo = Column(String, default="")
    anio = Column(Integer)
    descripcion = Column(Text, default="")
    fuente = Column(String, default="")


class Protocolo(Base):
    __tablename__ = "protocolos"
    id = Column(Integer, primary_key=True)
    equipo_id = _fk_equipo()
    tipo = Column(String, default="")  # Preventivo / Correctivo / Predictivo
    titulo = Column(String, default="")
    contenido = Column(Text, default="")
    fuente = Column(String, default="")


class Faq(Base):
    __tablename__ = "faq"
    id = Column(Integer, primary_key=True)
    pregunta = Column(Text, default="")
    respuesta = Column(Text, default="")
    fuente = Column(String, default="")


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True)
    nombre = Column(String, default="")
    correo = Column(String, default="")
    rol = Column(String, default="")


# ------------------------------------------------------------ asistente de IA
class Documento(Base):
    """Documento que el asistente puede consultar (PDF, página web o texto)."""

    __tablename__ = "documentos"
    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    tipo = Column(String, default="")
    fuente_url = Column(String, default="")
    fecha = Column(String, default="")
    paginas = Column(Integer, default=0)
    paginas_sin_texto = Column(Integer, default=0)
    formato = Column(String, default="pdf")  # pdf / web / texto
    creado = Column(String, default="")
    fragmentos = relationship("Fragmento", cascade="all, delete-orphan", passive_deletes=True)


class Fragmento(Base):
    __tablename__ = "fragmentos"
    id = Column(Integer, primary_key=True)
    documento_id = Column(Integer, ForeignKey("documentos.id", ondelete="CASCADE"), nullable=False, index=True)
    pagina = Column(Integer, nullable=False)
    texto = Column(Text, nullable=False)


class Consulta(Base):
    """Registro de cada pregunta hecha al asistente (auditoría)."""

    __tablename__ = "consultas"
    id = Column(Integer, primary_key=True)
    fecha = Column(String, default="")
    pregunta = Column(Text, default="")
    respuesta = Column(Text, default="")
    fuentes = Column(Text, default="")
    encontrado = Column(Integer, default=0)
    modelo_usado = Column(Integer, default=0)
    error = Column(Text)
