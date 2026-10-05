# Electro Safe — paquete de Corte 2 y 3

Este paquete está diseñado para integrarse al repositorio `Sun-Max13/Electro_Safe`.

## Qué incluye
- Hoja de vida digital.
- Inventario de accesorios.
- Registro de mantenimiento preventivo/correctivo/predictivo.
- Checklist interactivo.
- Registro de pruebas REM y salida RF.
- Dashboard inicial con MTBF, MTTR, disponibilidad y cumplimiento PM.
- Asistente IA demostrativo con recuperación local sobre una base documental.
- Lector QR con `html5-qrcode`.
- Exportación de reporte técnico PDF con `jsPDF`.
- JSON para equipo, inventario, checklist, pruebas, alarmas y base de conocimiento.

## Importante
GitHub Pages es frontend estático. No se debe colocar una API key de un proveedor de IA en JavaScript público. Para IA generativa real, usar un backend/serverless (por ejemplo, una función de Cloudflare/Vercel/otro proveedor) y guardar allí el secreto.

## Fuente técnica
La tabla de alarmas y los procedimientos incluidos como datos de referencia se tomaron del Service Manual del Valleylab Force FX-C. La plataforma debe conservar el manual original en `documentos/` y citarlo dentro del módulo IA.

## Integración
1. Copiar `data/`, `css/`, `js/` y adaptar `index.html` al diseño existente.
2. Mantener las rutas relativas.
3. Subir el repositorio y verificar GitHub Pages.
4. Probar el lector QR desde HTTPS.
5. Reemplazar los datos de demostración por los datos reales del equipo.
6. No llenar resultados de mediciones con valores inventados.

## IA real
Arquitectura recomendada:
Frontend → endpoint `/api/chat` → recuperación de fragmentos del manual → modelo generativo → respuesta con fuente/página → frontend.
El modelo debe tener una instrucción estricta: si la evidencia recuperada no contiene la respuesta, responder que no está disponible.
