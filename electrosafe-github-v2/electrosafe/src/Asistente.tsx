import { useCallback, useEffect, useState, type FormEvent } from "react"
import { DOCUMENTOS } from "./data"

const API =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000"

type Fuente = { documento: string; pagina: number; unidad?: string; fragmento: string }
type Mensaje = {
  q: string
  respuesta?: string
  fuentes?: Fuente[]
  aviso?: string | null
  modeloUsado?: boolean
  error?: string
}
type Doc = {
  id: number
  nombre: string
  tipo: string
  fuente_url: string
  fecha: string
  paginas: number
  paginas_sin_texto: number
  fragmentos: number
  formato?: string
}
type Salud = {
  documentos: number
  fragmentos: number
  modelo_configurado: boolean
  proveedor?: string | null
  base_datos?: string
}

const TIPOS = [
  "Manual",
  "Servicio",
  "Usuario",
  "Normativa",
  "Protocolo",
  "Bibliografía",
  "Instrumento",
  "Seguridad",
  "Guía clínica",
]

async function request(path: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, init)
  } catch (e) {
    console.error("Sin conexión con el backend:", API, e)
    throw new Error(
      `No se pudo conectar con el servidor (${API}). Verifique que el backend esté activo y que VITE_API_URL y CORS estén bien configurados.`,
    )
  }
  if (!res.ok) {
    let detalle = ""
    try {
      detalle = (await res.json()).detail
    } catch {
      /* respuesta sin JSON */
    }
    console.error("Error del backend:", path, res.status, detalle)
    throw new Error(detalle || `El servidor respondió con error ${res.status}.`)
  }
  return res
}

export function AsistenteIA() {
  const [pregunta, setPregunta] = useState("")
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargando, setCargando] = useState(false)
  const [salud, setSalud] = useState<Salud | null>(null)
  const [errorSalud, setErrorSalud] = useState("")

  useEffect(() => {
    request("/salud")
      .then((r) => r.json())
      .then((s: Salud) => setSalud(s))
      .catch((e: Error) => setErrorSalud(e.message))
  }, [])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const q = pregunta.trim()
    if (!q || cargando) return
    setPregunta("")
    setCargando(true)
    try {
      const r = await request("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q }),
      })
      const d = await r.json()
      setMensajes((p) => [
        ...p,
        {
          q,
          respuesta: d.respuesta,
          fuentes: d.fuentes,
          aviso: d.aviso,
          modeloUsado: d.modelo_usado,
        },
      ])
    } catch (err) {
      setMensajes((p) => [...p, { q, error: (err as Error).message }])
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow mb-2">Asistente RAG · responde solo con la documentación cargada</p>
      <h2 className="font-display text-3xl md:text-4xl text-surface mb-6">
        Consulta documental
      </h2>
      <div className="bg-navy-700/60 rounded-xl p-4 mb-5 text-sm text-slate-300">
        {errorSalud ? (
          <span>⚠ {errorSalud}</span>
        ) : salud ? (
          <span>
            Backend conectado ·{" "}
            {salud.base_datos === "postgresql"
              ? "base de datos Neon"
              : "base de datos local (temporal)"}{" "}
            · {salud.documentos} documento(s) ·{" "}
            {salud.fragmentos} fragmento(s) ·{" "}
            {salud.modelo_configurado
              ? `modelo de lenguaje: ${salud.proveedor ?? "configurado"}`
              : "sin clave del modelo (se mostrarán extractos literales)"}
          </span>
        ) : (
          <span>Conectando con el backend…</span>
        )}
      </div>
      <div className="space-y-4 mb-6" aria-live="polite">
        {mensajes.length ? (
          mensajes.map((m, i) => (
            <div key={i} className="record block">
              <p className="text-teal text-sm">Pregunta: {m.q}</p>
              {m.error ? (
                <p className="mt-3 text-red-300">{m.error}</p>
              ) : (
                <>
                  <p className="mt-3 text-surface whitespace-pre-wrap">
                    {m.respuesta}
                  </p>
                  {m.aviso && (
                    <p className="text-xs text-slate-400 mt-2">⚠ {m.aviso}</p>
                  )}
                  {m.fuentes?.map((f, j) => (
                    <details key={j} className="mt-3 text-sm">
                      <summary className="cursor-pointer text-teal">
                        {f.documento} · {f.unidad ?? "página"} {f.pagina}
                      </summary>
                      <p className="mt-2 text-slate-400 whitespace-pre-wrap">
                        {f.fragmento}
                      </p>
                    </details>
                  ))}
                </>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p className="font-medium text-surface">Sin consultas</p>
            <p className="text-sm">
              {salud && salud.documentos === 0
                ? "No hay documentos cargados: súbalos en Documentos → Documentos indexados."
                : "Escriba una pregunta sobre la documentación cargada."}
            </p>
          </div>
        )}
        {cargando && <p className="text-sm text-slate-400">Consultando…</p>}
      </div>
      <form onSubmit={enviar} className="flex flex-col sm:flex-row gap-3">
        <input
          className="control flex-1"
          aria-label="Pregunta a los documentos"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="¿Qué significa la alarma REM?"
        />
        <button className="button-primary" disabled={cargando}>
          Consultar
        </button>
      </form>
    </section>
  )
}

export function DocumentosIndexados() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [subiendo, setSubiendo] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState("Manual")
  const [fuente, setFuente] = useState("")
  const [fecha, setFecha] = useState("")
  const [estado, setEstado] = useState<Record<string, string>>({})
  const [indexando, setIndexando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await request("/documentos")
      setDocs(await r.json())
      setError("")
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const subir = async (e: FormEvent) => {
    e.preventDefault()
    if (!archivo) return
    setSubiendo(true)
    setMensaje("")
    const form = new FormData()
    form.append("archivo", archivo)
    form.append("nombre", nombre)
    form.append("tipo", tipo)
    form.append("fuente_url", fuente)
    form.append("fecha", fecha)
    try {
      const r = await request("/documentos", { method: "POST", body: form })
      const d = await r.json()
      setMensaje(
        d.advertencia ||
          `Indexado: ${d.paginas} página(s), ${d.fragmentos} fragmento(s).`,
      )
      setArchivo(null)
      setNombre("")
      setFuente("")
      setFecha("")
      ;(e.target as HTMLFormElement).reset()
      await cargar()
    } catch (err) {
      setMensaje((err as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  const yaIndexado = (url: string) => docs.some((d) => d.fuente_url === url)

  const indexarUno = async (item: { nombre: string; url: string; tipo: string }) => {
    setEstado((p) => ({ ...p, [item.url]: "Indexando…" }))
    try {
      const r = await request("/documentos/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, nombre: item.nombre, tipo: item.tipo }),
      })
      const d = await r.json()
      setEstado((p) => ({
        ...p,
        [item.url]: d.advertencia
          ? `⚠ ${d.advertencia}`
          : `✔ ${d.paginas} ${d.unidad ?? "página"}(s), ${d.fragmentos} fragmento(s)`,
      }))
    } catch (err) {
      setEstado((p) => ({ ...p, [item.url]: `✖ ${(err as Error).message}` }))
    }
    await cargar()
  }

  const indexarTodos = async () => {
    setIndexando(true)
    for (const item of DOCUMENTOS) {
      if (!docs.some((d) => d.fuente_url === item.url)) await indexarUno(item)
    }
    setIndexando(false)
  }

  const eliminar = async (d: Doc) => {
    if (!confirm(`¿Eliminar "${d.nombre}" y sus fragmentos?`)) return
    try {
      await request(`/documentos/${d.id}`, { method: "DELETE" })
      await cargar()
    } catch (err) {
      setMensaje((err as Error).message)
    }
  }

  return (
    <section className="panel mt-6">
      <p className="eyebrow mb-2">PDFs que consulta el asistente</p>
      <h2 className="font-display text-3xl text-surface mb-3">
        Documentos indexados
      </h2>
      <p className="text-sm text-slate-400 mb-5">
        Solo los PDF subidos aquí son consultados por el asistente. Los enlaces
        de la biblioteca son referencias externas.
      </p>
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-2xl text-surface">
            Indexar desde la biblioteca
          </h3>
          <button
            className="button-primary"
            onClick={indexarTodos}
            disabled={indexando}
          >
            {indexando ? "Indexando…" : "Indexar todos los pendientes"}
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Descarga cada enlace y lo indexa. Algunos sitios bloquean la
          descarga automática: en ese caso descargue el archivo y súbalo abajo.
          Si el servidor se reinicia hay que repetir este paso.
        </p>
        <div className="space-y-2">
          {DOCUMENTOS.map((item) => (
            <div key={item.url} className="record">
              <div className="min-w-0 flex-1">
                <p className="text-surface text-sm">
                  {item.nombre} <span className="tag">{item.tipo}</span>
                </p>
                {(estado[item.url] || yaIndexado(item.url)) && (
                  <p className="text-xs text-slate-400 mt-1">
                    {estado[item.url] || "✔ Indexado"}
                  </p>
                )}
              </div>
              <button
                className="link"
                disabled={indexando || yaIndexado(item.url)}
                onClick={() => indexarUno(item)}
              >
                {yaIndexado(item.url) ? "Listo" : "Indexar"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <h3 className="font-display text-2xl text-surface mb-3">
        Subir un archivo
      </h3>
      <form onSubmit={subir} className="mb-6">
        <div className="form-grid">
          <label className="field md:col-span-2">
            <span>Archivo (PDF, TXT o MD) *</span>
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              required
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="field">
            <span>Nombre (opcional)</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fuente (URL)</span>
            <input
              type="url"
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Fecha del documento</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
        </div>
        <button className="button-primary mt-4" disabled={subiendo || !archivo}>
          {subiendo ? "Indexando…" : "Subir e indexar"}
        </button>
        {mensaje && <p className="text-sm text-slate-300 mt-3">{mensaje}</p>}
      </form>
      {error && <p className="text-red-300 text-sm mb-4">⚠ {error}</p>}
      <div className="space-y-3">
        {docs.length ? (
          docs.map((d) => (
            <article key={d.id} className="record">
              <div className="min-w-0 flex-1">
                <p className="text-surface font-medium">
                  {d.nombre} <span className="tag">{d.tipo}</span>
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {d.formato === "web" ? "Web" : d.formato === "texto" ? "Texto" : "PDF"}{" "}
                  · {d.paginas} {d.formato && d.formato !== "pdf" ? "sección(es)" : "página(s)"} ·{" "}
                  {d.fragmentos} fragmento(s)
                  {d.fecha && ` · ${d.fecha}`}
                </p>
                {(d.fragmentos === 0 || d.paginas_sin_texto > 0) && (
                  <p className="text-sm text-red-300 mt-1">
                    ⚠{" "}
                    {d.fragmentos === 0
                      ? "Sin texto extraíble (si es PDF escaneado, necesita OCR)."
                      : `${d.paginas_sin_texto} página(s) sin texto: necesitan OCR.`}
                  </p>
                )}
                {d.fuente_url && (
                  <a
                    className="text-teal hover:underline text-sm"
                    href={d.fuente_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir fuente ↗
                  </a>
                )}
              </div>
              <button className="link text-red-300" onClick={() => eliminar(d)}>
                Eliminar
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <p className="font-medium text-surface">Sin documentos indexados</p>
            <p className="text-sm">Suba un PDF para que el asistente pueda consultarlo.</p>
          </div>
        )}
      </div>
    </section>
  )
}
