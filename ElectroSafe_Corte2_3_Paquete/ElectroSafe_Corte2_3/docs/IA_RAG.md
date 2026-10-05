# Arquitectura IA/RAG

## Nivel 1 — demostración para GitHub Pages
La carpeta `data/` contiene:
- `base_conocimiento.json`
- `alarmas_force_fx_c.json`
- `pruebas_force_fx_c.json`

El frontend hace búsqueda por palabras clave y por código de alarma. Esto permite demostrar el concepto sin exponer una API key.

## Nivel 2 — IA generativa real
Arquitectura:
1. Usuario escribe pregunta.
2. Backend recibe la pregunta.
3. Recupera fragmentos del manual Force FX-C.
4. Se pasan únicamente esos fragmentos al modelo.
5. El modelo responde con:
   - respuesta;
   - fuente;
   - sección/página;
   - nivel de confianza o "no encontrado".
6. El frontend muestra la respuesta.

## Prompt de sistema recomendado
"Responde únicamente con la evidencia documental proporcionada. No inventes valores, procedimientos, códigos de alarma, tolerancias ni conclusiones. Si la evidencia no contiene la respuesta, di claramente que no está disponible en la documentación cargada. Distingue entre dato del fabricante y dato ingresado por el técnico. Para mantenimiento o pruebas que impliquen riesgo eléctrico o RF, indica que deben ser realizadas por personal cualificado siguiendo el manual."

## Regla de demostración
Si el profesor pregunta por una alarma no cargada, el asistente debe responder "No encontrada en la base documental" en vez de inventar.
