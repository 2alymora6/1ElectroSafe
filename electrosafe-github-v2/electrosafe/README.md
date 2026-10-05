# ElectroSafe

Plataforma de gestión, mantenimiento y asistencia técnica del electrobisturí Valleylab Force FX-C.

- `src/` – página web (React + Vite + Tailwind). Se publica en **GitHub Pages**.
- `backend/` – servidor en Python (FastAPI): datos en **Neon** + asistente de IA. Se publica en **Render**.
- `documentos-grupo/` – plantillas que redacta el equipo y que lee el asistente.

## Correr en local
```
pnpm install
copy .env.example .env      (Mac/Linux: cp .env.example .env)
pnpm dev                    # página web

# en otra terminal: ver backend/README.md
```

## Publicar
1. **Neon**: crear proyecto y copiar la *connection string*.
2. **Render** (servicio del backend): variables `DATABASE_URL`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS=https://<usuario>.github.io`.
3. **GitHub**: Settings → Pages → Source: *GitHub Actions*. Variable `VITE_API_URL` = URL de Render. Run workflow.

## Estado
Ver `backend/README.md` para tablas, rutas y cómo funciona el asistente.
