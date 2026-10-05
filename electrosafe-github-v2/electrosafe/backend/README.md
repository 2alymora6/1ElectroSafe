# ElectroSafe – servidor (backend en Python)

Python + FastAPI + SQLAlchemy. Guarda los datos en **Neon** (PostgreSQL gratis) y contiene el asistente de IA.

## Archivos
| Archivo | Qué hace |
|---|---|
| `main.py` | Arma la aplicación y une las partes |
| `db.py` | Conexión a la base de datos (Neon o SQLite local) |
| `models.py` | Las tablas |
| `crud.py` | Listar / crear / editar / borrar / importar, igual para cada tabla |
| `checklists.py` | Inspecciones con sus ítems |
| `indicadores.py` | MTBF, MTTR, disponibilidad y cumplimiento |
| `asistente.py` | Asistente de IA (RAG) y documentos |
| `tests/` | Pruebas automáticas |

## Correr en el computador
```
cd backend
python -m venv .venv
.venv\Scripts\activate          (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          (Mac/Linux: cp .env.example .env)
uvicorn main:app --reload --port 8000
```
Sin `DATABASE_URL` usa el archivo `electrosafe.db` (si venía de una versión anterior, bórrelo). Abrir http://localhost:8000/salud y http://localhost:8000/docs (lista todo lo que ofrece el servidor).

## Pruebas
```
pip install -r requirements-dev.txt
pytest
```

## Neon (base de datos gratis y permanente)
1. neon.com → crear cuenta → crear proyecto.
2. Copiar la *connection string* (empieza por `postgresql://`).
3. En Render → Environment → `DATABASE_URL` = esa cadena.
4. `/salud` debe mostrar `"base_datos":"postgresql"`. Las tablas se crean solas al arrancar.

## Cargar la información que entrega el equipo
Cada tabla acepta carga masiva: `POST /<ruta>/importar?modo=agregar|reemplazar` con una lista JSON.
Rutas: `/inventario`, `/mantenimientos`, `/periodos`, `/resultados`, `/plantilla-checklist` (el checklist), `/riesgos`, `/normativas`, `/protocolos`, `/faq`, `/usuarios`, `/equipos` (hoja de vida).

## Indicadores
- Fallas = mantenimientos *Correctivos* que caen dentro de un período operativo.
- MTBF = horas operativas ÷ fallas · MTTR = horas de parada ÷ fallas · Disponibilidad = MTBF ÷ (MTBF + MTTR).

## Asistente de IA – cómo funciona (para la sustentación)
1. **Extracción**: PyMuPDF lee cada página del PDF (o se lee la página web / texto).
2. **Fragmentación**: ~300 palabras con solapamiento; cada fragmento guarda documento y página (o sección).
3. **Recuperación**: índice BM25. Si hay modelo, la pregunta también se traduce a palabras clave en inglés, porque los manuales están en inglés. Un fragmento solo cuenta si contiene suficientes palabras de la pregunta.
4. **Generación**: los mejores fragmentos van al modelo (Gemini gratis) con la orden de responder solo con ellos y citar `[n]`.
5. **Verificación de citas**: se acepta la respuesta solo si cita fragmentos realmente recuperados; si no, responde «No encuentro esa información en la documentación cargada».
6. **Registro**: cada consulta queda en la tabla `consultas`.
Sin clave de modelo, o si falla, muestra el extracto literal más relevante y lo avisa.

## Límites actuales
- No hay inicio de sesión: quien conozca la URL del servidor puede leer y modificar datos. Los roles de la página son solo de demostración.
- Si cambia `models.py` con datos ya guardados, hay que ajustar la tabla en Neon (aún no hay migraciones).
