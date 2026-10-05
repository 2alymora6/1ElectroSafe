import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { QRCodeSVG } from "qrcode.react"
import { CHECKLIST_ITEMS, DOCUMENTOS } from "./data"
import { AsistenteIA, DocumentosIndexados } from "./Asistente"

type Row = Record<string, string> & { id: string }
type Role = "Técnico biomédico" | "Ingeniero clínico" | "Administrador" | "Docente" | "Estudiante"
type Module = "inicio" | "hoja" | "inventario" | "mantenimiento" | "checklists" | "resultados" | "dashboard" | "asistente" | "documentos" | "reportes" | "usuarios"
type Store = {
  equipo: Row
  inventario: Row[]
  mantenimiento: Row[]
  checklists: Row[]
  resultados: Row[]
  periodos: Row[]
  documentos: Row[]
  usuarios: Row[]
}
type Field = {
  key: string
  label: string
  type?: string
  options?: string[]
  required?: boolean
}

const initial: Store = {
  equipo: {
    id: "force-fx",
    marca: "Valleylab",
    modelo: "Force FX-C",
    fabricante: "Medtronic / Covidien",
    serie: "",
    anio: "",
    ubicacion: "",
    estado: "",
    adquisicion: "",
    foto: "",
    proximo: "",
  },
  inventario: [],
  mantenimiento: [],
  checklists: [],
  resultados: [],
  periodos: [],
  usuarios: [],
  documentos: DOCUMENTOS.map((d, i) => ({
    id: `biblioteca-${i}`,
    nombre: d.nombre,
    tipo: d.tipo,
    fuente: d.url,
    fecha: "",
    pagina: "",
    extracto: "",
  })),
}
const roles: Role[] = [
  "Técnico biomédico",
  "Ingeniero clínico",
  "Administrador",
  "Docente",
  "Estudiante",
]
const nav: { id: Module; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "hoja", label: "Hoja de vida", icon: "▤" },
  { id: "inventario", label: "Inventario", icon: "▦" },
  { id: "mantenimiento", label: "Mantenimiento", icon: "⚙" },
  { id: "checklists", label: "Checklists", icon: "☑" },
  { id: "resultados", label: "Resultados", icon: "▥" },
  { id: "dashboard", label: "Dashboard", icon: "◫" },
  { id: "asistente", label: "Asistente IA", icon: "✧" },
  { id: "documentos", label: "Documentos", icon: "▣" },
  { id: "reportes", label: "Reportes", icon: "⇩" },
  { id: "usuarios", label: "Usuarios", icon: "♙" },
]
const permissions: Record<Role, Module[]> = {
  "Técnico biomédico": [
    "inicio",
    "hoja",
    "inventario",
    "mantenimiento",
    "checklists",
    "resultados",
    "dashboard",
    "asistente",
    "documentos",
    "reportes",
  ],
  "Ingeniero clínico": nav.filter((n) => n.id !== "usuarios").map((n) => n.id),
  Administrador: nav.map((n) => n.id),
  Docente: [
    "inicio",
    "hoja",
    "inventario",
    "mantenimiento",
    "checklists",
    "resultados",
    "dashboard",
    "asistente",
    "documentos",
    "reportes",
  ],
  Estudiante: [
    "inicio",
    "hoja",
    "inventario",
    "mantenimiento",
    "checklists",
    "resultados",
    "dashboard",
    "asistente",
    "documentos",
  ],
}
const editingRoles: Role[] = [
  "Técnico biomédico",
  "Ingeniero clínico",
  "Administrador",
]
const fields: Record<string, Field[]> = {
  equipo: [
    { key: "marca", label: "Marca", required: true },
    { key: "modelo", label: "Modelo", required: true },
    { key: "fabricante", label: "Fabricante" },
    { key: "serie", label: "Número de serie" },
    { key: "anio", label: "Año", type: "number" },
    { key: "ubicacion", label: "Servicio / ubicación" },
    {
      key: "estado",
      label: "Estado",
      options: ["Operativo", "En mantenimiento", "Fuera de servicio"],
    },
    { key: "adquisicion", label: "Fecha de adquisición", type: "date" },
    { key: "proximo", label: "Próximo mantenimiento programado", type: "date" },
  ],
  inventario: [
    { key: "nombre", label: "Accesorio o consumible", required: true },
    {
      key: "categoria",
      label: "Categoría",
      options: [
        "Electrodo de retorno REM",
        "Pedal",
        "Cables",
        "Lápiz",
        "Consumible",
        "Otro",
      ],
    },
    { key: "referencia", label: "Referencia" },
    { key: "cantidad", label: "Cantidad", type: "number", required: true },
    {
      key: "estado",
      label: "Estado",
      options: ["Disponible", "Bajo stock", "Agotado", "En revisión"],
    },
    { key: "foto", label: "Fotografía", type: "file" },
  ],
  mantenimiento: [
    { key: "fecha", label: "Fecha", type: "date", required: true },
    {
      key: "tipo",
      label: "Tipo",
      options: ["Preventivo", "Correctivo", "Predictivo"],
      required: true,
    },
    { key: "responsable", label: "Responsable", required: true },
    {
      key: "actividades",
      label: "Actividades / hallazgos",
      type: "textarea",
      required: true,
    },
    { key: "resultado", label: "Resultado", type: "textarea" },
    { key: "parada", label: "Tiempo de parada (h)", type: "number" },
    {
      key: "estado",
      label: "Estado",
      options: ["Pendiente", "En proceso", "Completado"],
    },
    { key: "evidencia", label: "Evidencia fotográfica", type: "file" },
  ],
  resultados: [
    { key: "fecha", label: "Fecha de prueba", type: "date", required: true },
    { key: "prueba", label: "Prueba", required: true },
    { key: "valor", label: "Valor medido", type: "number", required: true },
    { key: "unidad", label: "Unidad", required: true },
    { key: "responsable", label: "Responsable" },
    {
      key: "interpretacion",
      label: "Interpretación (escrita por el usuario)",
      type: "textarea",
    },
    { key: "evidencia", label: "Evidencia", type: "file" },
  ],
  periodos: [
    { key: "periodo", label: "Período", required: true },
    {
      key: "horas",
      label: "Tiempo operativo (h)",
      type: "number",
      required: true,
    },
    { key: "fallas", label: "N.º de fallas", type: "number", required: true },
    {
      key: "reparacion",
      label: "Tiempo total de reparación (h)",
      type: "number",
      required: true,
    },
    {
      key: "reparaciones",
      label: "N.º de reparaciones",
      type: "number",
      required: true,
    },
  ],
  documentos: [
    { key: "nombre", label: "Nombre", required: true },
    {
      key: "tipo",
      label: "Tipo",
      options: [
        "Manual",
        "Servicio",
        "Usuario",
        "Normativa",
        "Protocolo",
        "Bibliografía",
        "Instrumento",
        "Seguridad",
        "Guía clínica",
      ],
      required: true,
    },
    {
      key: "fuente",
      label: "Enlace directo (URL)",
      type: "url",
      required: true,
    },
    { key: "fecha", label: "Fecha del documento", type: "date" },
    { key: "pagina", label: "Página verificada para consulta", type: "number" },
    {
      key: "extracto",
      label: "Extracto literal verificado de esa página",
      type: "textarea",
    },
  ],
  usuarios: [
    { key: "nombre", label: "Nombre", required: true },
    { key: "correo", label: "Correo", type: "email", required: true },
    { key: "rol", label: "Rol", options: roles, required: true },
  ],
}
const id = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
function load(): Store {
  try {
    const saved = JSON.parse(
      localStorage.getItem("electrosafe-v2") || "null",
    ) as Partial<Store> | null
    if (saved)
      return {
        ...initial,
        ...saved,
        equipo: { ...initial.equipo, ...saved.equipo },
        documentos: saved.documentos ?? initial.documentos,
      }
  } catch {
    /* A corrupt or full browser store should not block the UI. */
  }
  return initial
}
function FileLink({
  url,
  label = "Ver evidencia",
}: {
  url?: string
  label?: string
}) {
  if (!url) return null
  return (
    <a
      className="text-teal hover:underline text-sm"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label} ↗
    </a>
  )
}
function Empty({ text = "Sin registros" }: { text?: string }) {
  return (
    <div className="empty-state">
      <span className="text-3xl text-teal">◇</span>
      <p className="font-medium text-surface">{text}</p>
      <p className="text-sm">
        Los datos aparecerán aquí cuando el equipo los registre.
      </p>
    </div>
  )
}
function Photo({ url, className = "" }: { url?: string; className?: string }) {
  return (
    <div className={`photo-frame ${className}`}>
      {url ? (
        <img
          src={url}
          alt="Electrobisturí Valleylab Force FX-C"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="text-center p-6">
          <div className="text-5xl text-teal/50 mb-3">▣</div>
          <strong className="block text-surface">
            Fotografía del equipo pendiente
          </strong>
          <span className="text-sm">
            Carga electrobisturi.jpg desde Hoja de vida
          </span>
        </div>
      )}
    </div>
  )
}
function FormFields({
  specs,
  value,
  setValue,
}: {
  specs: Field[]
  value: Row
  setValue: (r: Row) => void
}) {
  const change = (
    field: Field,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (field.type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (!file.type.startsWith("image/")) return
      const reader = new FileReader()
      reader.onload = () =>
        setValue({ ...value, [field.key]: String(reader.result) })
      reader.readAsDataURL(file)
    } else setValue({ ...value, [field.key]: e.target.value })
  }
  return (
    <div className="form-grid">
      {specs.map((f) => (
        <label
          key={f.key}
          className={`field ${
            f.type === "textarea" || f.type === "file" ? "md:col-span-2" : ""
          }`}
        >
          <span>
            {f.label}
            {f.required ? " *" : ""}
          </span>
          {f.options ? (
            <select
              required={f.required}
              value={value[f.key] || ""}
              onChange={(e) => change(f, e)}
            >
              <option value="">Seleccionar</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              required={f.required}
              value={value[f.key] || ""}
              onChange={(e) => change(f, e)}
              rows={3}
            />
          ) : f.type === "file" ? (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => change(f, e)}
              />
              {value[f.key] && (
                <img
                  alt="Vista previa"
                  src={value[f.key]}
                  className="max-h-32 rounded-lg object-contain self-start"
                />
              )}
            </>
          ) : (
            <input
              required={f.required}
              type={f.type || "text"}
              min={f.type === "number" ? 0 : undefined}
              step={f.type === "number" ? "any" : undefined}
              value={value[f.key] || ""}
              onChange={(e) => change(f, e)}
            />
          )}
        </label>
      ))}
    </div>
  )
}
function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel">
      <div className="flex flex-wrap gap-3 justify-between items-start mb-6">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="font-display text-3xl md:text-4xl text-surface">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export default function App() {
  const [data, setData] = useState<Store>(load)
  const [section, setSection] = useState<Module>(() =>
    new URLSearchParams(location.search).get("equipo") ? "hoja" : "inicio",
  )
  const [role, setRole] = useState<Role>("Administrador")
  const [menuOpen, setMenuOpen] = useState(false)
  const [edit, setEdit] = useState<{ table: keyof Store; row: Row } | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [checkDate, setCheckDate] = useState("")
  const [checkOwner, setCheckOwner] = useState("")
  const [checkEditId, setCheckEditId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, {
    status: string
    note: string
    photo: string
  }>>({})
  const editable = editingRoles.includes(role)
  const canEdit = (table: keyof Store) =>
    editable && (table !== "usuarios" || role === "Administrador")
  const update = (next: Store) => {
    setData(next)
    try {
      localStorage.setItem("electrosafe-v2", JSON.stringify(next))
    } catch {
      alert(
        "No se pudo guardar en este navegador. Reduzca el tamaño de las fotografías o libere espacio.",
      )
    }
  }
  const go = (to: Module) => {
    setSection(to)
    setMenuOpen(false)
    setSearch("")
    setTypeFilter("")
    setDateFilter("")
    window.scrollTo(0, 0)
  }
  const start = (table: keyof Store, row?: Row) =>
    setEdit({ table, row: row ? { ...row } : { id: id() } })
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!edit) return
    if (edit.table === "documentos" && Boolean(edit.row.pagina) !== Boolean(edit.row.extracto?.trim())) {
      alert("Para habilitar consultas documentales, registre juntos la página y el extracto literal.")
      return
    }
    if (edit.table === "equipo") update({ ...data, equipo: edit.row })
    else {
      const table = edit.table as Exclude<keyof Store, "equipo">
      const rows = data[table] as Row[]
      update({
        ...data,
        [table]: rows.some((r) => r.id === edit.row.id)
          ? rows.map((r) => (r.id === edit.row.id ? edit.row : r))
          : [...rows, edit.row],
      })
    }
    setEdit(null)
  }
  const remove = (table: Exclude<keyof Store, "equipo">, row: Row) => {
    if (
      !confirm(
        `¿Eliminar ${row.nombre || row.fecha || row.periodo || "este registro"}?`,
      )
    )
      return
    update({
      ...data,
      [table]: (data[table] as Row[]).filter((r) => r.id !== row.id),
    })
  }
  const readFile = (file: File | undefined, cb: (value: string) => void) => {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => cb(String(reader.result))
    reader.readAsDataURL(file)
  }
  const editChecklist = (row: Row) => {
    setCheckEditId(row.id)
    setCheckDate(row.fecha)
    setCheckOwner(row.responsable)
    setAnswers(JSON.parse(row.items || "{}"))
    window.scrollTo(0, 0)
  }
  const saveChecklist = (e: FormEvent) => {
    e.preventDefault()
    const row = {
      id: checkEditId || id(),
      fecha: checkDate,
      responsable: checkOwner,
      items: JSON.stringify(answers),
    }
    update({
      ...data,
      checklists: checkEditId
        ? data.checklists.map((r) => (r.id === checkEditId ? row : r))
        : [...data.checklists, row],
    })
    setAnswers({})
    setCheckDate("")
    setCheckOwner("")
    setCheckEditId(null)
  }
  const qrUrl = `${location.origin}${location.pathname}?equipo=${encodeURIComponent(data.equipo.id)}`
  const downloadQR = () => {
    const svg = document.querySelector<SVGSVGElement>("#equipment-qr svg")
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `ElectroSafe-${data.equipo.serie || "equipo"}-QR.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const totals = data.periodos.reduce(
    (a, p) => ({
      hours: a.hours + (+p.horas || 0),
      failures: a.failures + (+p.fallas || 0),
      repair: a.repair + (+p.reparacion || 0),
      repairs: a.repairs + (+p.reparaciones || 0),
    }),
    { hours: 0, failures: 0, repair: 0, repairs: 0 },
  )
  const mtbf = totals.failures > 0 ? totals.hours / totals.failures : null
  const mttr = totals.repairs > 0 ? totals.repair / totals.repairs : null
  const availability =
    mtbf !== null && mttr !== null && mtbf + mttr > 0
      ? (100 * mtbf) / (mtbf + mttr)
      : null
  const completed = data.mantenimiento.filter(
    (m) => m.estado === "Completado",
  ).length
  const compliance = data.mantenimiento.length
    ? (100 * completed) / data.mantenimiento.length
    : null
  const deadline = data.equipo.proximo
    ? Math.ceil(
        (new Date(`${data.equipo.proximo}T00:00:00`).getTime() - Date.now()) /
          86400000,
      )
    : null
  const filtered = (rows: Row[]) =>
    rows
      .filter((r) =>
        Object.values(r).some(
          (v) =>
            typeof v === "string" &&
            !v.startsWith("data:") &&
            v.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")),
        ),
      )
      .filter((r) => !typeFilter || r.tipo === typeFilter)
      .filter((r) => !dateFilter || r.fecha === dateFilter)
  const listing = (
    table: Exclude<keyof Store, "equipo">,
    summary: (r: Row) => ReactNode,
  ) => (
    <div className="space-y-3">
      {filtered(data[table]).length ? (
        filtered(data[table]).map((row) => (
          <article key={row.id} className="record">
            <div className="min-w-0 flex-1">{summary(row)}</div>
            {canEdit(table) && (
              <div className="flex gap-3 shrink-0">
                <button
                  className="link"
                  onClick={() =>
                    table === "checklists"
                      ? editChecklist(row)
                      : start(table, row)
                  }
                >
                  Editar
                </button>
                <button
                  className="link text-red-300"
                  onClick={() => remove(table, row)}
                >
                  Eliminar
                </button>
              </div>
            )}
          </article>
        ))
      ) : (
        <Empty
          text={data[table].length ? "Sin coincidencias" : "Sin registros"}
        />
      )}
    </div>
  )
  const searchBar = (table: keyof Store, extra?: ReactNode) => (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <input
        aria-label="Buscar registros"
        className="control flex-1 min-w-44"
        placeholder="Buscar registros..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {extra}
      {canEdit(table) && table !== "checklists" && (
        <button className="button-primary" onClick={() => start(table)}>
          + Nuevo registro
        </button>
      )}
    </div>
  )
  const metric = (label: string, value: string, note: string) => (
    <div className="metric">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-4xl mt-4 text-surface">{value}</p>
      <p className="text-sm mt-2 text-slate-400">{note}</p>
    </div>
  )
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="p-7 border-b border-navy-600">
          <button className="text-left" onClick={() => go("inicio")}>
            <span className="inline-flex h-9 w-9 rounded-lg bg-teal text-navy items-center justify-center font-bold mr-3">
              ✚
            </span>
            <span className="font-display text-2xl text-surface">
              ElectroSafe
            </span>
          </button>
          <p className="eyebrow mt-5">Ingeniería biomédica / gestión clínica</p>
        </div>
        <nav className="p-4 space-y-1" aria-label="Navegación principal">
          {nav
            .filter((n) => permissions[role].includes(n.id))
            .map((n) => (
              <button
                key={n.id}
                className={`nav-item ${section === n.id ? "selected" : ""}`}
                onClick={() => go(n.id)}
              >
                <span aria-hidden="true" className="w-6 text-center text-lg">
                  {n.icon}
                </span>
                {n.label}
              </button>
            ))}
        </nav>
        <div className="p-6 border-t border-navy-600 mt-auto">
          <p className="eyebrow mb-2">Vista de rol · demostración</p>
          <select
            aria-label="Vista de rol"
            className="control w-full"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role)
              go("inicio")
            }}
          >
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-3">
            Permisos visuales, no autenticación real.
          </p>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-shade"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <button
            className="md:hidden text-2xl mr-4"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          {section === "hoja" && (
            data.equipo.foto ? <img src={data.equipo.foto} alt="Equipo Valleylab Force FX-C" className="w-10 h-10 rounded-lg object-contain bg-navy-700" /> : <span className="text-xs text-slate-400 border border-navy-600 rounded-lg p-2">Foto pendiente</span>
          )}
          <div className="text-sm text-slate-400 mr-auto">
            Plataforma /{" "}
            <span className="text-surface">
              {nav.find((n) => n.id === section)?.label}
            </span>
          </div>
          <span className="hidden sm:block text-xs text-teal border border-teal/30 rounded-full px-3 py-1">
            Prototipo local · Sin datos experimentales precargados
          </span>
        </header>
        <main className="content">
          <div className="mb-8">
            <p className="eyebrow mb-2">ElectroSafe / Force FX-C</p>
            <h1 className="font-display text-4xl md:text-5xl text-surface">
              {nav.find((n) => n.id === section)?.label}
            </h1>
            <p className="text-slate-400 mt-3">
              Gestión documental y trazabilidad del electrobisturí Valleylab
              Force FX-C.
            </p>
          </div>
          {section === "inicio" && (
            <>
              <div className="hero">
                <div className="relative z-10">
                  <p className="eyebrow text-teal mb-5">
                    PLATAFORMA DE INGENIERÍA CLÍNICA / ELECTROCIRUGÍA
                  </p>
                  <h2 className="font-display text-4xl md:text-6xl leading-tight text-surface max-w-xl">
                    Cada intervención,{" "}
                    <em className="text-teal">documentada.</em>
                  </h2>
                  <p className="text-slate-300 mt-5 max-w-xl leading-relaxed">
                    Centralice la hoja de vida, inspecciones, pruebas y
                    mantenimiento. Los resultados provienen exclusivamente de
                    registros ingresados por su equipo.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-8">
                    <button
                      className="button-primary"
                      onClick={() => go("hoja")}
                    >
                      Ver hoja de vida →
                    </button>
                    <button
                      className="button-secondary"
                      onClick={() => go("mantenimiento")}
                    >
                      Registrar intervención
                    </button>
                  </div>
                </div>
                <Photo url={data.equipo.foto} className="hero-photo" />
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {metric(
                  "Equipo",
                  data.equipo.serie || "Sin serie",
                  data.equipo.estado || "Estado sin registrar",
                )}
                {metric(
                  "Intervenciones",
                  String(data.mantenimiento.length),
                  "Registros ingresados",
                )}
                {metric(
                  "Pruebas",
                  String(data.resultados.length),
                  "Resultados ingresados",
                )}
              </div>
              <div className="panel mt-6">
                <p className="eyebrow mb-3">Flujo de trabajo</p>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    [
                      "01",
                      "Identifique",
                      "Complete la hoja de vida y el inventario.",
                    ],
                    [
                      "02",
                      "Registre",
                      "Documente inspecciones, intervenciones y mediciones.",
                    ],
                    [
                      "03",
                      "Analice",
                      "Revise indicadores y exporte un informe técnico.",
                    ],
                  ].map(([n, title, desc]) => (
                    <div key={n}>
                      <span className="text-teal font-mono">{n} /</span>
                      <h3 className="text-xl text-surface mt-2">{title}</h3>
                      <p className="text-sm text-slate-400 mt-2">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {section === "hoja" && (
            <Panel
              title="Identificación del equipo"
              eyebrow="Registro maestro"
              action={
                canEdit("equipo") && (
                  <button
                    className="button-primary"
                    onClick={() => start("equipo", data.equipo)}
                  >
                    Editar hoja de vida
                  </button>
                )
              }
            >
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
                <Photo url={data.equipo.foto} className="min-h-72" />
                <div className="grid sm:grid-cols-2 gap-x-8">
                  {fields.equipo.map((f) => (
                    <div key={f.key} className="info-line">
                      <span>{f.label}</span>
                      <strong>{data.equipo[f.key] || "Sin registros"}</strong>
                    </div>
                  ))}
                  <div className="info-line">
                    <span>Código QR</span>
                    <button className="link text-left" onClick={downloadQR}>
                      Descargar SVG ↓
                    </button>
                  </div>
                </div>
              </div>
              <div
                id="equipment-qr"
                className="mt-8 flex items-center gap-6 flex-wrap"
              >
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={qrUrl} size={112} />
                </div>
                <p className="text-sm max-w-md text-slate-400">
                  El QR enlaza a esta hoja de vida mediante el identificador del
                  equipo. La URL solo será accesible por terceros cuando el
                  sitio se publique.
                </p>
              </div>
            </Panel>
          )}
          {section === "inventario" && (
            <Panel
              title="Accesorios y consumibles"
              eyebrow="Control de existencias"
            >
              {searchBar("inventario")}
              {listing("inventario", (r) => (
                <>
                  <p className="text-surface font-medium">
                    {r.nombre}{" "}
                    <span className="tag">
                      {r.categoria || "Sin categoría"}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Ref. {r.referencia || "Sin referencia"} · Cantidad:{" "}
                    {r.cantidad} · {r.estado || "Estado sin registrar"}
                  </p>
                  {r.foto && (
                    <img
                      src={r.foto}
                      alt={r.nombre}
                      className="max-h-28 rounded-lg mt-3"
                    />
                  )}
                </>
              ))}
            </Panel>
          )}
          {section === "mantenimiento" && (
            <Panel
              title="Historial de mantenimiento"
              eyebrow="Preventivo / correctivo / predictivo"
            >
              {searchBar(
                "mantenimiento",
                <>
                  <select
                    aria-label="Filtrar por tipo"
                    className="control"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    {["Preventivo", "Correctivo", "Predictivo"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    aria-label="Filtrar por fecha"
                    className="control"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </>,
              )}
              <div className="timeline">
                {listing("mantenimiento", (r) => (
                  <>
                    <p className="text-surface font-medium">
                      {r.tipo || "Intervención"}{" "}
                      <span className="tag">{r.estado || "Sin estado"}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      {r.fecha} · {r.responsable} · Parada:{" "}
                      {r.parada || "Sin registro"} h
                    </p>
                    <p className="text-sm mt-3">{r.actividades}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Resultado: {r.resultado || "Sin registros"}
                    </p>
                    <FileLink url={r.evidencia} />
                  </>
                ))}
              </div>
            </Panel>
          )}
          {section === "checklists" && (
            <>
              <Panel title="Nueva inspección" eyebrow="Evaluación por ítem">
                {canEdit("checklists") ? (
                  <form onSubmit={saveChecklist}>
                    <div className="form-grid mb-6">
                      <label className="field">
                        <span>Fecha *</span>
                        <input
                          type="date"
                          required
                          value={checkDate}
                          onChange={(e) => setCheckDate(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Responsable *</span>
                        <input
                          required
                          value={checkOwner}
                          onChange={(e) => setCheckOwner(e.target.value)}
                        />
                      </label>
                    </div>
                    {[
                      ...new Set(CHECKLIST_ITEMS.map((item) => item.category)),
                    ].map((category) => (
                      <div key={category} className="mb-7">
                        <h3 className="eyebrow mb-3">{category}</h3>
                        <div className="space-y-3">
                          {CHECKLIST_ITEMS.filter(
                            (item) => item.category === category,
                          ).map((item) => {
                            const answer = answers[item.id] || {
                              status: "",
                              note: "",
                              photo: "",
                            }
                            return (
                              <div className="record block" key={item.id}>
                                <p className="text-surface mb-3">{item.item}</p>
                                <div className="flex flex-wrap gap-3">
                                  <select
                                    aria-label={`Evaluación: ${item.item}`}
                                    className="control"
                                    value={answer.status}
                                    onChange={(e) =>
                                      setAnswers({
                                        ...answers,
                                        [item.id]: {
                                          ...answer,
                                          status: e.target.value,
                                        },
                                      })
                                    }
                                  >
                                    <option value="">Sin evaluar</option>
                                    <option>Cumple</option>
                                    <option>No cumple</option>
                                    <option>Observación</option>
                                  </select>
                                  <input
                                    aria-label={`Observación: ${item.item}`}
                                    className="control flex-1 min-w-40"
                                    placeholder="Observación / valor medido"
                                    value={answer.note}
                                    onChange={(e) =>
                                      setAnswers({
                                        ...answers,
                                        [item.id]: {
                                          ...answer,
                                          note: e.target.value,
                                        },
                                      })
                                    }
                                  />
                                  <label className="file-label">
                                    Foto
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        readFile(e.target.files?.[0], (photo) =>
                                          setAnswers((prev) => ({
                                            ...prev,
                                            [item.id]: {
                                              ...(prev[item.id] || {
                                                status: "",
                                                note: "",
                                              }),
                                              photo,
                                            },
                                          })),
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                                {answer.photo && (
                                  <img
                                    src={answer.photo}
                                    alt="Evidencia del ítem"
                                    className="max-h-24 mt-3 rounded"
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <button
                      className="button-primary"
                      disabled={!Object.values(answers).some((a) => a.status)}
                    >
                      {checkEditId
                        ? "Actualizar inspección"
                        : "Guardar inspección"}
                    </button>
                    {checkEditId && (
                      <button
                        type="button"
                        className="button-secondary ml-3"
                        onClick={() => {
                          setCheckEditId(null)
                          setAnswers({})
                          setCheckDate("")
                          setCheckOwner("")
                        }}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </form>
                ) : (
                  <p className="text-slate-400">
                    Vista de consulta para este rol.
                  </p>
                )}
              </Panel>
              <Panel title="Inspecciones guardadas" eyebrow="Historial">
                {searchBar("checklists")}
                {listing("checklists", (r) => {
                  const items = JSON.parse(r.items || "{}") as Record<string, {
                    status: string
                    note: string
                    photo: string
                  }>
                  return (
                    <>
                      <p className="text-surface">
                        {r.fecha} · {r.responsable}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        {Object.values(items).filter((v) => v.status).length}{" "}
                        ítems evaluados
                      </p>
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-teal">
                          Ver respuestas
                        </summary>
                        {CHECKLIST_ITEMS.filter((c) => items[c.id]?.status).map(
                          (c) => (
                            <div
                              key={c.id}
                              className="py-2 border-b border-navy-600"
                            >
                              {c.item}: <strong>{items[c.id].status}</strong> ·{" "}
                              {items[c.id].note || "Sin observación"}
                              <div>
                                <FileLink
                                  url={items[c.id].photo}
                                  label="Ver foto"
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </details>
                    </>
                  )
                })}
              </Panel>
            </>
          )}
          {section === "resultados" && (
            <Panel
              title="Resultados de pruebas"
              eyebrow="Mediciones ingresadas / interpretación humana"
            >
              {searchBar("resultados")}
              {data.resultados.length > 0 && (
                <div className="panel mb-5">
                  <p className="eyebrow mb-4">
                    Visualización de mediciones registradas
                  </p>
                  {filtered(data.resultados)
                    .filter((r) => +r.valor >= 0 && r.valor !== "")
                    .map((r) => {
                      const sameUnit = data.resultados
                        .filter(
                          (v) => v.unidad === r.unidad && v.prueba === r.prueba,
                        )
                        .map((v) => +v.valor)
                      const max = Math.max(...sameUnit, 0)
                      return (
                        <div key={r.id} className="mb-3">
                          <div className="flex justify-between text-sm gap-3">
                            <span>
                              {r.prueba} · {r.fecha}
                            </span>
                            <strong>
                              {r.valor} {r.unidad}
                            </strong>
                          </div>
                          <div className="bg-navy-700 h-2 rounded-full mt-2">
                            <div
                              className="bg-teal h-full rounded-full"
                              style={{
                                width: `${max ? (+r.valor / max) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  <p className="text-xs text-slate-400 mt-4">
                    Escala relativa por prueba y unidad; no indica conformidad
                    ni límites.
                  </p>
                </div>
              )}
              {listing("resultados", (r) => (
                <>
                  <p className="text-surface font-medium">
                    {r.prueba}: {r.valor} {r.unidad}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {r.fecha} · {r.responsable || "Responsable sin registrar"}
                  </p>
                  <p className="text-sm mt-2">
                    Interpretación: {r.interpretacion || "Sin registros"}
                  </p>
                  <FileLink url={r.evidencia} />
                </>
              ))}
            </Panel>
          )}
          {section === "dashboard" && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {metric(
                  "MTBF",
                  mtbf === null ? "—" : `${mtbf.toFixed(1)} h`,
                  "Tiempo operativo ÷ n.º de fallas",
                )}
                {metric(
                  "MTTR",
                  mttr === null ? "—" : `${mttr.toFixed(1)} h`,
                  "Reparación total ÷ n.º de reparaciones",
                )}
                {metric(
                  "Disponibilidad",
                  availability === null ? "—" : `${availability.toFixed(1)}%`,
                  "MTBF ÷ (MTBF + MTTR)",
                )}
                {metric(
                  "Cumplimiento",
                  compliance === null ? "—" : `${compliance.toFixed(0)}%`,
                  "Intervenciones completadas / registradas",
                )}
              </div>
              <Panel
                title="Períodos operativos"
                eyebrow="Datos para indicadores"
              >
                {searchBar("periodos")}
                {listing("periodos", (r) => (
                  <>
                    <p className="text-surface font-medium">{r.periodo}</p>
                    <p className="text-sm text-slate-400 mt-2">
                      {r.horas} h operativas · {r.fallas} fallas ·{" "}
                      {r.reparaciones} reparaciones · {r.reparacion} h de
                      reparación
                    </p>
                  </>
                ))}
              </Panel>
              <div className="panel mt-6">
                <p className="eyebrow mb-3">Próximo mantenimiento</p>
                <p className="text-surface text-lg">
                  {deadline === null
                    ? "Sin fecha programada"
                    : deadline < 0
                      ? `Vencido hace ${Math.abs(deadline)} día(s)`
                      : deadline <= 30
                        ? `Próximo en ${deadline} día(s)`
                        : `Programado para ${data.equipo.proximo}`}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Configure la fecha en Hoja de vida. El cumplimiento solo
                  considera intervenciones registradas; no equivale a
                  cumplimiento del plan institucional.
                </p>
              </div>
            </>
          )}
          {section === "asistente" && <AsistenteIA />}
          {section === "documentos" && (
            <>
            <Panel
              title="Biblioteca técnica"
              eyebrow="Manuales / normas / protocolos / bibliografía"
            >
              <p className="text-sm text-slate-400 mb-5">
                Referencias externas de la biblioteca del borrador. El
                asistente de IA no consulta estos enlaces: solo lee los PDF
                subidos en «Documentos indexados».
              </p>
              {searchBar(
                "documentos",
                <select
                  className="control"
                  aria-label="Tipo de documento"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {[...new Set(data.documentos.map((d) => d.tipo))].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>,
              )}
              {listing("documentos", (r) => (
                <>
                  <p className="text-surface font-medium">
                    {r.nombre} <span className="tag">{r.tipo}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Fecha: {r.fecha || "Sin registrar"}{" "}
                    {r.pagina && `· Página verificada: ${r.pagina}`}
                  </p>
                  <FileLink url={r.fuente} label="Abrir fuente" />
                </>
              ))}
            </Panel>
            <DocumentosIndexados />
            <div className="panel mt-6">
              <p className="eyebrow mb-3">Referencia del borrador / seguridad</p>
              <h3 className="font-display text-2xl text-surface mb-3">Riesgos a evaluar</h3>
              <p className="text-sm text-slate-400 mb-4">Temas documentales, no una evaluación institucional. Severidad, probabilidad y controles deben ser validados por el equipo.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {['Quemaduras en el electrodo de retorno', 'Incendio en el campo quirúrgico', 'Corrientes de fuga', 'Acoplamiento capacitivo', 'Interferencia con dispositivos implantados', 'Salida de potencia fuera de especificación'].map(risk => <div className="record" key={risk}><span className="text-surface">{risk}</span><span className="text-xs text-slate-400">Valoración: sin registros</span></div>)}
              </div>
            </div>
            </>
          )}
          {section === "reportes" && (
            <Panel title="Informe técnico" eyebrow="Exportación local">
              <p className="text-slate-300 mb-5">
                El informe reúne únicamente registros ingresados. Use «Guardar
                como PDF» en el diálogo de impresión del navegador.
              </p>
              <button
                className="button-primary mb-7 print:hidden"
                onClick={() => window.print()}
              >
                Generar informe técnico / Guardar como PDF ↓
              </button>
              <div className="space-y-6" id="report-print">
                <div>
                  <p className="eyebrow">Equipo</p>
                  <p>
                    {data.equipo.marca} {data.equipo.modelo} · Serie:{" "}
                    {data.equipo.serie || "Sin registros"} · Ubicación:{" "}
                    {data.equipo.ubicacion || "Sin registros"} · Estado:{" "}
                    {data.equipo.estado || "Sin registros"}
                  </p>
                </div>
                {(["mantenimiento", "checklists", "resultados"] as const).map(
                  (table) => (
                    <div key={table}>
                      <p className="eyebrow capitalize">{table}</p>
                      {data[table].length ? (
                        data[table].map((r) => (
                          <div
                            className="border-b border-navy-600 py-3 text-sm"
                            key={r.id}
                          >
                            {table === "checklists" ? (
                              <>
                                <strong>
                                  {r.fecha} · {r.responsable}
                                </strong>
                                <p>
                                  {CHECKLIST_ITEMS.filter(
                                    (c) =>
                                      JSON.parse(r.items || "{}")[c.id]?.status,
                                  )
                                    .map(
                                      (c) =>
                                        `${c.item}: ${JSON.parse(r.items)[c.id].status} (${JSON.parse(r.items)[c.id].note || "Sin observación"})`,
                                    )
                                    .join(" · ")}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.values(JSON.parse(r.items || "{}") as Record<string, { photo?: string }>).filter((item) => item.photo).map((item, index) => (
                                    <img key={index} alt="Evidencia de checklist" src={item.photo} className="max-h-28" />
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                {Object.entries(r)
                                  .filter(
                                    ([k, v]) =>
                                      k !== "id" &&
                                      !String(v).startsWith("data:"),
                                  )
                                  .map(([k, v]) => (
                                    <span key={k} className="mr-3">
                                      {k}: {v || "Sin registros"};{" "}
                                    </span>
                                  ))}
                              </>
                            )}
                            {r.evidencia && (
                              <img
                                alt="Evidencia"
                                src={r.evidencia}
                                className="max-h-28 mt-2"
                              />
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm">Sin registros</p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </Panel>
          )}
          {section === "usuarios" && (
            <Panel
              title="Usuarios y roles"
              eyebrow="Administración local · sin cuentas reales"
            >
              {searchBar("usuarios")}
              {listing("usuarios", (r) => (
                <>
                  <p className="text-surface font-medium">
                    {r.nombre} <span className="tag">{r.rol}</span>
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{r.correo}</p>
                </>
              ))}
              <p className="text-xs text-slate-400 mt-5">
                Estos perfiles son registros locales; no permiten iniciar sesión
                ni garantizan control de acceso.
              </p>
            </Panel>
          )}
        </main>
        <footer className="px-6 md:px-10 py-7 border-t border-navy-600 text-xs text-slate-400">
          ElectroSafe · Proyecto integrador de Ingeniería Biomédica · Datos
          locales de prototipo
        </footer>
      </div>
      {edit && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setEdit(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Editar registro"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="eyebrow mb-2">Formulario de registro</p>
                <h2 className="font-display text-3xl text-surface">
                  {edit.table === "equipo"
                    ? "Hoja de vida"
                    : nav.find((n) => n.id === edit.table)?.label || edit.table}
                </h2>
              </div>
              <button
                className="link text-2xl"
                aria-label="Cerrar"
                onClick={() => setEdit(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <FormFields
                specs={fields[edit.table] || []}
                value={edit.row}
                setValue={(row) => setEdit({ ...edit, row })}
              />
              {edit.table === "equipo" && (
                <label className="field mt-4">
                  <span>Fotografía del equipo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      readFile(e.target.files?.[0], (photo) =>
                        setEdit(
                          (prev) =>
                            prev && {
                              ...prev,
                              row: { ...prev.row, foto: photo },
                            },
                        ),
                      )
                    }
                  />
                  {edit.row.foto && (
                    <img
                      alt="Fotografía del equipo"
                      src={edit.row.foto}
                      className="max-h-32 object-contain self-start"
                    />
                  )}
                </label>
              )}
              <div className="flex justify-end gap-3 mt-7">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setEdit(null)}
                >
                  Cancelar
                </button>
                <button className="button-primary">Guardar registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
