"""Asistente de IA de ElectroSafe (RAG: recuperación + generación).

Flujo: documento (PDF / web / texto) -> secciones -> fragmentos -> índice BM25
-> recuperación (en español y en inglés) -> modelo de lenguaje (solo con los
fragmentos) -> verificación de citas. Documentos y fragmentos se guardan en la
base de datos, así que no se pierden al reiniciar el servidor.
"""
import ipaddress
import json
import math
import os
import re
import socket
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, insert, select
from sqlalchemy.orm import Session

from db import SessionLocal, get_db
from models import Consulta, Documento, Fragmento

router = APIRouter(tags=["asistente"])

# --- Configuración (se puede cambiar con variables de entorno) ---
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-5-5")  # solo si usa Anthropic
TOP_K = int(os.getenv("TOP_K", "5"))
MIN_COVERAGE = float(os.getenv("MIN_COVERAGE", "0.4"))
MIN_COVERAGE_EXTRA = float(os.getenv("MIN_COVERAGE_EXTRA", "0.25"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "40"))
CHUNK_WORDS = 300
CHUNK_OVERLAP = 50
SECTION_CHARS = 2500
K1, B = 1.5, 0.75

NO_ENCONTRADO = "No encuentro esa información en la documentación cargada"
SYSTEM_PROMPT = (
    "Eres el asistente técnico de ElectroSafe para el electrobisturí Valleylab Force FX. "
    "Responde solo con los fragmentos de documentación que se te entregan. "
    "No uses conocimiento externo. Cita cada afirmación con el número del fragmento "
    "entre corchetes, por ejemplo [1] o [2]. "
    f"Si los fragmentos no contienen la respuesta, responde exactamente: '{NO_ENCONTRADO}'. "
    "No inventes valores, normas, códigos de error ni procedimientos. "
    "Los fragmentos pueden estar en inglés; responde siempre en español. "
    "Si la pregunta es ambigua, pide aclaración. Sé breve y técnico."
)
PROMPT_EXPANSION = (
    "Eres un traductor técnico. Recibes una pregunta en español sobre un electrobisturí "
    "(equipo biomédico). Devuelve SOLO entre 6 y 12 palabras clave técnicas en inglés "
    "equivalentes a la pregunta, separadas por espacios, sin explicaciones ni signos."
)


def ahora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def abreviatura(formato) -> str:
    return "p." if (formato or "pdf") == "pdf" else "sec."


def unidad(formato) -> str:
    return "página" if (formato or "pdf") == "pdf" else "sección"


# ------------------------------------------------------------------ texto / BM25
STOPWORDS = set(
    """a al algo ante con contra cual cuales cuando de del desde donde el ella ellos en entre
    era es esa ese eso esta este esto estos fue ha han hay la las le les lo los me mi mis mucho
    muy no nos o para pero por porque que quien se si sin sobre su sus te tiene tienen todo tu
    un una uno unos y ya como cuanto cuantos hace hacer puede pueden debe deben son ser sea
    estan estar mas
    the of to is and in for with that this be are or on as by an if it at from not must should
    can may will shall which when where what how""".split()
)


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _raiz(w: str) -> str:
    return w[:-1] if len(w) > 3 and w.endswith("s") else w


def tokens(texto: str) -> list[str]:
    return [
        _raiz(w)
        for w in re.findall(r"[a-z0-9]+", normalizar(texto))
        if len(w) > 1 and w not in STOPWORDS
    ]


class Index:
    def __init__(self, rows: list[dict]):
        self.rows = rows
        self.docs = [tokens(r["texto"]) for r in rows]
        self.tf = [Counter(d) for d in self.docs]
        self.n = len(rows)
        total = sum(len(d) for d in self.docs)
        self.avg = (total / self.n) if self.n and total else 1.0
        self.df: Counter = Counter()
        for d in self.docs:
            for w in set(d):
                self.df[w] += 1

    def search(self, query: str, k: int = TOP_K, min_cov: float = MIN_COVERAGE) -> list[dict]:
        q = list(dict.fromkeys(tokens(query)))
        if not q or not self.n:
            return []
        scored = []
        for i, tf in enumerate(self.tf):
            matched = [w for w in q if w in tf]
            if not matched:
                continue
            dl = len(self.docs[i])
            score = 0.0
            for w in matched:
                idf = math.log(1 + (self.n - self.df[w] + 0.5) / (self.df[w] + 0.5))
                f = tf[w]
                score += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * dl / self.avg))
            scored.append((score, len(matched) / len(q), i))
        scored.sort(reverse=True)
        return [
            {**self.rows[i], "score": round(s, 3), "cobertura": round(c, 2)}
            for s, c, i in scored[:k]
            if c >= min_cov
        ]


_index: Index | None = None


def invalidar_indice():
    global _index
    _index = None


def get_index() -> Index:
    global _index
    if _index is None:
        with SessionLocal() as db:
            consulta = (
                select(Fragmento.id, Fragmento.pagina, Fragmento.texto, Documento.nombre, Documento.formato)
                .join(Documento, Documento.id == Fragmento.documento_id)
            )
            rows = [dict(r._mapping) for r in db.execute(consulta)]
        _index = Index(rows)
    return _index


def buscar(pregunta: str, extra: str | None = None) -> list[dict]:
    """Busca con la pregunta original y, si hay, con su version en ingles."""
    idx = get_index()
    res = idx.search(pregunta, TOP_K)
    if extra:
        vistos = {h["id"] for h in res}
        for h in idx.search(extra, TOP_K, MIN_COVERAGE_EXTRA):
            if h["id"] not in vistos:
                res.append(h)
        res.sort(key=lambda h: h["score"], reverse=True)
    return res[:TOP_K]


# ---------------------------------------------------- lectura de documentos
def extraer_paginas(data: bytes) -> list[tuple[int, str]]:
    paginas = []
    with fitz.open(stream=data, filetype="pdf") as pdf:
        for n, page in enumerate(pdf, start=1):
            paginas.append((n, page.get_text("text").strip()))
    return paginas


def leer_pdf(data: bytes) -> list[tuple[int, str]]:
    try:
        return extraer_paginas(data)
    except Exception as e:  # PDF corrupto o protegido
        raise HTTPException(422, f"No se pudo leer el PDF: {e}")


class _HTMLTexto(HTMLParser):
    OMITIR = {"script", "style", "noscript", "svg"}
    BLOQUES = {
        "p", "div", "br", "li", "tr", "section", "article", "table", "ul", "ol",
        "pre", "h1", "h2", "h3", "h4", "h5", "h6",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.partes: list[str] = []
        self.omitir = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.OMITIR:
            self.omitir += 1
        elif tag in self.BLOQUES:
            self.partes.append("\n")

    def handle_endtag(self, tag):
        if tag in self.OMITIR:
            self.omitir = max(0, self.omitir - 1)
        elif tag in self.BLOQUES:
            self.partes.append("\n")

    def handle_data(self, data):
        if not self.omitir:
            self.partes.append(data)


def html_a_texto(html: str) -> str:
    p = _HTMLTexto()
    p.feed(html)
    texto = "".join(p.partes)
    texto = re.sub(r"[ \t\r\f\v]+", " ", texto)
    return re.sub(r"\n\s*\n+", "\n\n", texto).strip()


def texto_a_secciones(texto: str, max_chars: int = SECTION_CHARS) -> list[tuple[int, str]]:
    parrafos = [p.strip() for p in re.split(r"\n\s*\n", texto) if p.strip()]
    secciones, actual = [], ""
    for p in parrafos:
        if actual and len(actual) + len(p) + 2 > max_chars:
            secciones.append(actual)
            actual = p
        else:
            actual = f"{actual}\n\n{p}" if actual else p
    if actual:
        secciones.append(actual)
    return list(enumerate(secciones, 1))


def dividir(texto: str, size: int = CHUNK_WORDS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = texto.split()
    out, i = [], 0
    while i < len(words):
        out.append(" ".join(words[i : i + size]))
        if i + size >= len(words):
            break
        i += size - overlap
    return out


def guardar_documento(db: Session, nombre, tipo, fuente_url, fecha, formato, paginas):
    sin_texto = sum(1 for _, t in paginas if not t)
    fragmentos = [(n, ch) for n, t in paginas if t for ch in dividir(t)]
    doc = Documento(
        nombre=nombre, tipo=tipo, fuente_url=fuente_url, fecha=fecha,
        paginas=len(paginas), paginas_sin_texto=sin_texto, formato=formato, creado=ahora(),
    )
    db.add(doc)
    db.flush()  # asigna doc.id
    if fragmentos:
        db.execute(
            insert(Fragmento),
            [{"documento_id": doc.id, "pagina": n, "texto": t} for n, t in fragmentos],
        )
    db.commit()
    invalidar_indice()

    advertencia = None
    if not fragmentos:
        advertencia = (
            "No se pudo extraer texto (PDF escaneado: aplique OCR)."
            if formato == "pdf"
            else "La página no tiene texto extraíble (puede cargarse con JavaScript o estar protegida). Descárguela como PDF y súbala."
        )
    elif sin_texto:
        advertencia = f"{sin_texto} página(s) sin texto extraíble (posible escaneo). Aplique OCR para incluirlas."
    return {
        "id": doc.id,
        "nombre": nombre,
        "formato": formato,
        "unidad": unidad(formato),
        "paginas": len(paginas),
        "paginas_sin_texto": sin_texto,
        "fragmentos": len(fragmentos),
        "advertencia": advertencia,
    }


# ------------------------------------------------------ descarga de enlaces
def _ip_publica(host: str):
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise HTTPException(400, "No se pudo resolver el dominio del enlace.")
    for info in infos:
        if not ipaddress.ip_address(info[4][0]).is_global:
            raise HTTPException(400, "El enlace apunta a una dirección no permitida.")


def validar_url(url: str):
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise HTTPException(400, "El enlace debe empezar por http:// o https://")
    _ip_publica(p.hostname)


class _RedirectSeguro(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validar_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def descargar(url: str):
    validar_url(url)
    opener = urllib.request.build_opener(_RedirectSeguro)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ElectroSafe/1.0)",
            "Accept": "text/html,application/pdf,text/plain,*/*",
        },
    )
    limite = MAX_UPLOAD_MB * 1024 * 1024
    try:
        with opener.open(req, timeout=60) as r:
            data = r.read(limite + 1)
            ctype = r.headers.get_content_type()
            charset = r.headers.get_content_charset()
    except urllib.error.HTTPError as e:
        raise HTTPException(
            502, f"El sitio respondió con error {e.code}. Descargue el archivo y súbalo manualmente."
        )
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise HTTPException(502, f"No se pudo descargar el enlace: {e}")
    if len(data) > limite:
        raise HTTPException(413, f"El archivo supera {MAX_UPLOAD_MB} MB.")
    return data, ctype, charset


def decodificar(data: bytes, charset: str | None) -> str:
    try:
        return data.decode(charset or "utf-8", errors="replace")
    except LookupError:
        return data.decode("utf-8", errors="replace")


# --------------------------------------------------------------------------- API
def _documento_dict(d: Documento, fragmentos: int) -> dict:
    return {
        "id": d.id, "nombre": d.nombre, "tipo": d.tipo, "fuente_url": d.fuente_url, "fecha": d.fecha,
        "paginas": d.paginas, "paginas_sin_texto": d.paginas_sin_texto, "formato": d.formato,
        "fragmentos": fragmentos,
    }


@router.post("/documentos", status_code=201)
async def subir_documento(
    archivo: UploadFile = File(...),
    nombre: str = Form(""),
    tipo: str = Form("Manual"),
    fuente_url: str = Form(""),
    fecha: str = Form(""),
    db: Session = Depends(get_db),
):
    arch = (archivo.filename or "").lower()
    data = await archivo.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera {MAX_UPLOAD_MB} MB.")
    if arch.endswith(".pdf"):
        formato, paginas = "pdf", leer_pdf(data)
    elif arch.endswith((".txt", ".md")):
        texto = decodificar(data, "utf-8")
        if "[COMPLETAR" in texto:
            raise HTTPException(
                422, "El documento todavía tiene marcas [COMPLETAR]. Complételas o bórrelas antes de subirlo."
            )
        formato, paginas = "texto", texto_a_secciones(texto)
    else:
        raise HTTPException(400, "Solo se aceptan archivos PDF, TXT o MD.")
    nombre = nombre.strip() or (archivo.filename or "documento")
    return guardar_documento(db, nombre, tipo, fuente_url, fecha, formato, paginas)


class DocUrl(BaseModel):
    url: str
    nombre: str = ""
    tipo: str = "Manual"
    fecha: str = ""


@router.post("/documentos/url", status_code=201)
def indexar_desde_url(body: DocUrl, db: Session = Depends(get_db)):
    url = body.url.strip()
    if db.scalar(select(Documento.id).where(Documento.fuente_url == url)):
        raise HTTPException(409, "Ese enlace ya está indexado.")
    data, ctype, charset = descargar(url)
    if data[:5] == b"%PDF-":
        formato, paginas = "pdf", leer_pdf(data)
    elif "html" in ctype or data.lstrip()[:15].lower().startswith((b"<!doctype", b"<html")):
        formato = "web"
        paginas = texto_a_secciones(html_a_texto(decodificar(data, charset)))
    elif ctype.startswith("text/"):
        formato = "texto"
        paginas = texto_a_secciones(decodificar(data, charset))
    else:
        raise HTTPException(415, f"Tipo de contenido no soportado: {ctype}")
    nombre = body.nombre.strip() or url
    return guardar_documento(db, nombre, body.tipo, url, body.fecha, formato, paginas)


@router.get("/documentos")
def listar_documentos(db: Session = Depends(get_db)):
    consulta = (
        select(Documento, func.count(Fragmento.id))
        .outerjoin(Fragmento, Fragmento.documento_id == Documento.id)
        .group_by(Documento.id)
        .order_by(Documento.id.desc())
    )
    return [_documento_dict(d, n) for d, n in db.execute(consulta)]


@router.delete("/documentos/{doc_id}", status_code=204)
def eliminar_documento(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Documento, doc_id)
    if doc is None:
        raise HTTPException(404, "Documento no encontrado.")
    db.delete(doc)
    db.commit()
    invalidar_indice()
    return Response(status_code=204)


# ------------------------------------------------------------- modelo de lenguaje
def proveedor() -> str | None:
    pref = os.getenv("LLM_PROVIDER", "").strip().lower()
    gem, ant = os.getenv("GEMINI_API_KEY"), os.getenv("ANTHROPIC_API_KEY")
    if pref == "gemini":
        return "gemini" if gem else None
    if pref == "anthropic":
        return "anthropic" if ant else None
    if gem:
        return "gemini"
    if ant:
        return "anthropic"
    return None


def _llamar_gemini(system: str, usuario: str, max_tokens: int) -> str:
    cuerpo = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": usuario}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": max(max_tokens, 1024)},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(cuerpo).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": os.environ["GEMINI_API_KEY"],
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        try:
            msg = json.load(e).get("error", {}).get("message", "")
        except Exception:
            msg = ""
        raise RuntimeError(f"Gemini respondió {e.code}: {msg[:160]}")
    cands = data.get("candidates") or []
    if not cands:
        raise RuntimeError(f"Gemini no devolvió respuesta: {data.get('promptFeedback')}")
    partes = (cands[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in partes if not p.get("thought")).strip()


def _llamar_anthropic(system: str, usuario: str, max_tokens: int) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    msg = client.messages.create(
        model=LLM_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": usuario}],
    )
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()


def llamar_modelo(system: str, usuario: str, max_tokens: int = 800) -> str:
    prov = proveedor()
    if prov == "gemini":
        return _llamar_gemini(system, usuario, max_tokens)
    if prov == "anthropic":
        return _llamar_anthropic(system, usuario, max_tokens)
    raise RuntimeError("No hay proveedor de modelo configurado.")


def expandir_consulta(pregunta: str) -> str | None:
    """Palabras clave en ingles para poder buscar en manuales en ingles."""
    if not proveedor():
        return None
    try:
        return llamar_modelo(PROMPT_EXPANSION, pregunta, 120)[:300] or None
    except Exception:
        return None


def armar_usuario(pregunta: str, hits: list[dict]) -> str:
    contexto = "\n\n".join(
        f"[{i}] Documento: {h['nombre']} | {unidad(h.get('formato'))}: {h['pagina']}\n{h['texto']}"
        for i, h in enumerate(hits, 1)
    )
    return f"FRAGMENTOS:\n\n{contexto}\n\nPREGUNTA: {pregunta}"


# ------------------------------------------------------------------------- chat
class Pregunta(BaseModel):
    pregunta: str


def fuente(h: dict) -> dict:
    return {
        "documento": h["nombre"],
        "pagina": h["pagina"],
        "unidad": unidad(h.get("formato")),
        "fragmento": h["texto"][:600],
    }


def registrar(pregunta, respuesta, fuentes, encontrado, modelo_usado, aviso=None, error=None):
    with SessionLocal() as db:
        db.add(Consulta(
            fecha=ahora(), pregunta=pregunta, respuesta=respuesta,
            fuentes=json.dumps(fuentes, ensure_ascii=False),
            encontrado=int(encontrado), modelo_usado=int(modelo_usado), error=error,
        ))
        db.commit()
    return {
        "respuesta": respuesta,
        "fuentes": fuentes,
        "encontrado": encontrado,
        "modelo_usado": modelo_usado,
        "aviso": aviso,
    }


def verificar(texto: str, hits: list[dict]):
    """Acepta la respuesta solo si cita fragmentos que realmente se recuperaron."""
    if not texto or NO_ENCONTRADO.lower() in texto.lower():
        return None
    citados = list(dict.fromkeys(int(n) for n in re.findall(r"\[(\d+)\]", texto)))
    validos = [n for n in citados if 1 <= n <= len(hits)]
    if not validos:
        return None

    def reemplazar(m):
        n = int(m.group(1))
        if 1 <= n <= len(hits):
            h = hits[n - 1]
            return f"({h['nombre']}, {abreviatura(h.get('formato'))} {h['pagina']})"
        return ""

    return re.sub(r"\[(\d+)\]", reemplazar, texto), [fuente(hits[n - 1]) for n in validos]


def respuesta_extractiva(hits: list[dict]) -> str:
    h = hits[0]
    extracto = h["texto"] if len(h["texto"]) <= 700 else h["texto"][:700] + "…"
    return f"Extracto más relevante ({h['nombre']}, {abreviatura(h.get('formato'))} {h['pagina']}): {extracto}"


@router.post("/chat")
def chat(body: Pregunta):
    pregunta = body.pregunta.strip()
    if not pregunta:
        raise HTTPException(400, "La pregunta está vacía.")
    prov = proveedor()
    extra = expandir_consulta(pregunta) if prov else None
    hits = buscar(pregunta, extra)
    if not hits:
        return registrar(pregunta, NO_ENCONTRADO, [], False, False)

    error = None
    if prov:
        try:
            texto = llamar_modelo(SYSTEM_PROMPT, armar_usuario(pregunta, hits), 800)
            ver = verificar(texto, hits)
            if ver is None:
                return registrar(pregunta, NO_ENCONTRADO, [], False, True)
            return registrar(pregunta, ver[0], ver[1], True, True)
        except Exception as e:
            error = f"{type(e).__name__}: {e}"
            aviso = f"El modelo de lenguaje no respondió ({str(e)[:140]}). Se muestra el extracto más relevante sin generación."
    else:
        aviso = "No hay clave de modelo configurada (GEMINI_API_KEY); se muestra el extracto más relevante sin generación."

    return registrar(
        pregunta,
        respuesta_extractiva(hits),
        [fuente(h) for h in hits[:3]],
        True,
        False,
        aviso,
        error,
    )
