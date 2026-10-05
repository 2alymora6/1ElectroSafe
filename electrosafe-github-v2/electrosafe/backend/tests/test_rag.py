import fitz
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import asistente as ia
import main

client = TestClient(main.app)

# Textos de prueba: solo sirven para probar el software, no son información técnica del equipo.
FRASE = "Este documento de prueba indica que la inspeccion visual del cable es obligatoria antes de cada uso."
FRASE_EN = "The test document states that the power cord visual inspection is mandatory before every use."


def pdf_bytes(paginas):
    doc = fitz.open()
    for texto in paginas:
        page = doc.new_page()
        page.insert_textbox((72, 72, 520, 770), texto)
    data = doc.tobytes()
    doc.close()
    return data


def limpiar():
    for d in client.get("/documentos").json():
        client.delete(f"/documentos/{d['id']}")


def test_flujo_completo():
    limpiar()
    salud = client.get("/salud").json()
    assert salud["estado"] == "ok" and salud["base_datos"] == "sqlite"

    r = client.post(
        "/documentos",
        files={"archivo": ("prueba.pdf", pdf_bytes(["Pagina uno sin relacion.", FRASE]), "application/pdf")},
        data={"nombre": "Documento de prueba (v1)", "tipo": "Manual"},
    )
    assert r.status_code == 201
    doc_id = r.json()["id"]
    assert r.json()["paginas"] == 2 and r.json()["fragmentos"] == 2

    lista = client.get("/documentos").json()
    assert lista[0]["nombre"] == "Documento de prueba (v1)" and lista[0]["fragmentos"] == 2

    ok = client.post("/chat", json={"pregunta": "inspeccion visual del cable"}).json()
    assert ok["encontrado"] is True
    assert ok["fuentes"][0]["pagina"] == 2
    assert ok["fuentes"][0]["documento"] == "Documento de prueba (v1)"

    fuera = client.post("/chat", json={"pregunta": "cual es la capital de Francia"}).json()
    assert fuera["encontrado"] is False
    assert fuera["respuesta"] == ia.NO_ENCONTRADO
    assert fuera["fuentes"] == []

    assert client.delete(f"/documentos/{doc_id}").status_code == 204
    assert client.delete(f"/documentos/{doc_id}").status_code == 404
    assert client.get("/documentos").json() == []
    vacio = client.post("/chat", json={"pregunta": "inspeccion visual del cable"}).json()
    assert vacio["encontrado"] is False


def test_pregunta_vacia():
    assert client.post("/chat", json={"pregunta": "   "}).status_code == 400


def test_rechaza_formato_no_soportado():
    r = client.post("/documentos", files={"archivo": ("a.docx", b"hola", "application/octet-stream")})
    assert r.status_code == 400


def test_verificacion_de_citas():
    hits = [{"nombre": "Manual (Servicio)", "pagina": 7, "texto": "x"}]
    texto, fuentes = ia.verificar("La alarma indica falla [1].", hits)
    assert "(Manual (Servicio), p. 7)" in texto and fuentes[0]["pagina"] == 7
    assert ia.verificar("Dato inventado [5].", hits) is None
    assert ia.verificar("Dato sin cita.", hits) is None


def test_subir_markdown_y_rechazar_plantilla_sin_completar():
    limpiar()
    ok = client.post(
        "/documentos",
        files={"archivo": ("faq.md", "# FAQ\n\nLa inspeccion visual del cable es obligatoria.".encode(), "text/markdown")},
        data={"nombre": "FAQ del grupo", "tipo": "Protocolo"},
    )
    assert ok.status_code == 201 and ok.json()["formato"] == "texto"
    r = client.post("/chat", json={"pregunta": "inspeccion visual del cable"}).json()
    assert r["encontrado"] and r["fuentes"][0]["unidad"] == "sección"
    assert "sec. 1" in r["respuesta"]

    pendiente = client.post(
        "/documentos",
        files={"archivo": ("plantilla.md", b"# Normativa\n\n[COMPLETAR: norma]", "text/markdown")},
    )
    assert pendiente.status_code == 422
    limpiar()


def test_indexar_desde_url_web_y_pdf(monkeypatch):
    limpiar()
    html = f"<html><head><style>x{{}}</style></head><body><script>var a=1;</script><p>{FRASE}</p></body></html>"
    monkeypatch.setattr(ia, "descargar", lambda url: (html.encode(), "text/html", "utf-8"))
    web = client.post("/documentos/url", json={"url": "https://ejemplo.test/norma", "nombre": "Norma web", "tipo": "Normativa"})
    assert web.status_code == 201 and web.json()["formato"] == "web" and web.json()["fragmentos"] == 1
    assert client.post("/documentos/url", json={"url": "https://ejemplo.test/norma"}).status_code == 409

    monkeypatch.setattr(ia, "descargar", lambda url: (pdf_bytes([FRASE_EN]), "application/pdf", None))
    pdf = client.post("/documentos/url", json={"url": "https://ejemplo.test/manual.pdf", "nombre": "Manual en inglés"})
    assert pdf.status_code == 201 and pdf.json()["formato"] == "pdf"
    docs = {d["nombre"]: d for d in client.get("/documentos").json()}
    assert docs["Norma web"]["formato"] == "web"
    assert "var a=1" not in ia.html_a_texto(html)
    limpiar()


def test_bloquea_direcciones_internas():
    for url in ("http://127.0.0.1/x", "http://localhost/x", "ftp://ejemplo.test/x"):
        with pytest.raises(HTTPException):
            ia.validar_url(url)


def test_pregunta_en_espanol_sobre_manual_en_ingles(monkeypatch):
    limpiar()
    client.post(
        "/documentos",
        files={"archivo": ("manual.pdf", pdf_bytes([FRASE_EN]), "application/pdf")},
        data={"nombre": "Manual en inglés", "tipo": "Servicio"},
    )
    # Sin modelo no puede cruzar de idioma: no debe inventar nada.
    sin_modelo = client.post("/chat", json={"pregunta": "inspección del cable de alimentación antes de usar"}).json()
    assert sin_modelo["encontrado"] is False

    monkeypatch.setenv("GEMINI_API_KEY", "clave-falsa")

    def falso(system, usuario, max_tokens=800):
        if system == ia.PROMPT_EXPANSION:
            return "power cord visual inspection mandatory before use"
        return "Debe inspeccionarse visualmente el cable antes de cada uso [1]."

    monkeypatch.setattr(ia, "llamar_modelo", falso)
    con_modelo = client.post("/chat", json={"pregunta": "inspección del cable de alimentación antes de usar"}).json()
    assert con_modelo["encontrado"] is True and con_modelo["modelo_usado"] is True
    assert "(Manual en inglés, p. 1)" in con_modelo["respuesta"]

    # Si el modelo cita un fragmento inexistente, se rechaza.
    monkeypatch.setattr(
        ia, "llamar_modelo",
        lambda s, u, m=800: "power cord visual inspection" if s == ia.PROMPT_EXPANSION else "Dato inventado [9].",
    )
    inventado = client.post("/chat", json={"pregunta": "inspección del cable de alimentación antes de usar"}).json()
    assert inventado["encontrado"] is False and inventado["respuesta"] == ia.NO_ENCONTRADO
    limpiar()
