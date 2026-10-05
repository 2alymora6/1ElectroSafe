from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_el_equipo_inicial_existe():
    equipos = client.get("/equipos").json()
    assert equipos[0]["marca"] == "Valleylab" and equipos[0]["modelo"] == "Force FX-C"


def test_crud_equipo_y_conversion_de_numeros():
    eq = client.get("/equipos").json()[0]
    r = client.put(f"/equipos/{eq['id']}", json={"serie": "S-1", "anio": "2019", "desconocido": "x"})
    assert r.status_code == 200 and r.json()["anio"] == 2019 and r.json()["serie"] == "S-1"
    assert client.put(f"/equipos/{eq['id']}", json={"anio": "abc"}).status_code == 422
    assert client.put(f"/equipos/{eq['id']}", json={"anio": ""}).json()["anio"] is None
    assert client.get("/equipos/9999").status_code == 404


def test_campos_obligatorios_y_referencias():
    assert client.post("/inventario", json={"cantidad": "2"}).status_code == 422  # falta nombre
    assert client.post("/inventario", json={"nombre": "Pedal", "equipo_id": 9999}).status_code == 400
    eq_id = client.get("/equipos").json()[0]["id"]
    ok = client.post("/inventario", json={"nombre": "Pedal", "equipo_id": str(eq_id), "cantidad": "2"})
    assert ok.status_code == 201 and ok.json()["cantidad"] == 2
    filtrado = client.get(f"/inventario?equipo_id={eq_id}").json()
    assert any(f["nombre"] == "Pedal" for f in filtrado)
    assert client.delete(f"/inventario/{ok.json()['id']}").status_code == 204


def test_importar_reemplazar_y_agregar():
    client.post("/faq/importar?modo=reemplazar", json=[{"pregunta": "P1"}, {"pregunta": "P2"}])
    assert len(client.get("/faq").json()) == 2
    client.post("/faq/importar", json=[{"pregunta": "P3"}])
    assert len(client.get("/faq").json()) == 3
    # una fila inválida no borra nada
    malo = client.post("/faq/importar?modo=reemplazar", json=[{"respuesta": "sin pregunta"}])
    assert malo.status_code == 422 and len(client.get("/faq").json()) == 3
    client.post("/faq/importar?modo=reemplazar", json=[])


def test_checklist_con_items_anidados():
    eq_id = client.get("/equipos").json()[0]["id"]
    plantilla = client.post("/plantilla-checklist", json={"categoria": "Visual", "descripcion": "Revisar cable"}).json()
    nuevo = client.post(
        "/checklists",
        json={
            "equipo_id": eq_id, "fecha": "2026-10-01", "responsable": "Ana",
            "items": [
                {"plantilla_id": plantilla["id"], "descripcion": "Revisar cable", "evaluacion": "Cumple"},
                {"descripcion": "Otro", "evaluacion": "No cumple", "observacion": "desgaste"},
            ],
        },
    )
    assert nuevo.status_code == 201 and len(nuevo.json()["items"]) == 2
    cid = nuevo.json()["id"]
    editado = client.put(
        f"/checklists/{cid}",
        json={"equipo_id": eq_id, "fecha": "2026-10-02", "responsable": "Ana", "items": [{"descripcion": "Solo uno", "evaluacion": "Cumple"}]},
    )
    assert len(editado.json()["items"]) == 1 and editado.json()["fecha"] == "2026-10-02"
    # al borrar la plantilla, el historial conserva la descripción
    assert client.delete(f"/plantilla-checklist/{plantilla['id']}").status_code == 204
    assert client.get(f"/checklists/{cid}").status_code == 200
    assert client.delete(f"/checklists/{cid}").status_code == 204
    assert client.get(f"/checklists/{cid}").status_code == 404
    assert client.post("/checklists", json={"equipo_id": 9999, "fecha": "2026-10-01", "responsable": "x"}).status_code == 400


def test_indicadores_se_calculan_desde_los_registros():
    eq_id = client.get("/equipos").json()[0]["id"]
    vacio = client.get("/indicadores").json()
    assert vacio["mtbf_horas"] is None and vacio["cumplimiento_pct"] is None

    client.post("/periodos", json={"equipo_id": eq_id, "nombre": "T1", "fecha_inicio": "2026-01-01", "fecha_fin": "2026-03-31", "horas_operativas": "1000"})
    for fecha, tipo, parada, estado in [
        ("2026-02-01", "Correctivo", "4", "Completado"),
        ("2026-03-01", "Correctivo", "6", "Completado"),
        ("2026-03-15", "Preventivo", "1", "Pendiente"),
        ("2026-08-01", "Correctivo", "9", "Completado"),  # fuera del período: no cuenta como falla
    ]:
        r = client.post("/mantenimientos", json={"equipo_id": eq_id, "fecha": fecha, "tipo": tipo, "responsable": "Ana", "horas_parada": parada, "estado": estado})
        assert r.status_code == 201

    ind = client.get(f"/indicadores?equipo_id={eq_id}").json()
    assert ind["detalle"]["fallas"] == 2 and ind["detalle"]["horas_operativas"] == 1000
    assert ind["mtbf_horas"] == 500 and ind["mttr_horas"] == 5
    assert round(ind["disponibilidad_pct"], 2) == round(100 * 500 / 505, 2)
    assert ind["cumplimiento_pct"] == 75  # 3 de 4 completados
