export const DOCUMENTOS = [
  {
    nombre: "Manual de Servicio Force FX-C (iFixit)",
    url: "https://www.ifixit.com/Document/WCoqQeEbNr26o2PK/Valleylab%20Force%20FX-C%20Service%20Manual.pdf",
    tipo: "Servicio",
    paginas: 214,
  },
  {
    nombre: "Manual de Servicio Force FX-C (alternativo)",
    url: "http://www.frankshospitalworkshop.com/equipment/documents/electrosurgery/service_manuals/Valleylab%20Force%20FX-C%20ESU%20-%20Service%20manual.pdf",
    tipo: "Servicio",
    paginas: 214,
  },
  {
    nombre: "Manual de Servicio Force FX-8C",
    url: "http://www.frankshospitalworkshop.com/equipment/documents/electrosurgery/service_manuals/Valleylab_Force_FX-8c_Electrosurgical_Generator_-_Service_manual.pdf",
    tipo: "Servicio",
    paginas: null,
  },
  {
    nombre: "Manual de Usuario Force FX-C (v1)",
    url: "https://cdn.shopify.com/s/files/1/1046/1086/files/ValleyLab-Force-FXc-Electrosurgical-Generator-User-Manual.pdf",
    tipo: "Usuario",
    paginas: null,
  },
  {
    nombre: "Manual de Usuario Force FX-C (v2)",
    url: "https://avobus.com/pdf/test/Valleylab_Force_FX_C_Instructions.pdf",
    tipo: "Usuario",
    paginas: null,
  },
  {
    nombre: "Decreto 4725 de 2005 — INVIMA",
    url: "https://www.invima.gov.co/biblioteca/decreto-4725-de-2005pdf-1",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Resolución 4816 de 2008 — Minsalud",
    url: "https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/DIJ/Resoluci%C3%B3n_4816_de_2008.pdf",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Resolución 4816 de 2008 — Normograma INVIMA",
    url: "https://normograma.invima.gov.co/compilacion/docs/resolucion_minproteccion_4816_2008.htm",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Programa Nacional de Tecnovigilancia — INVIMA",
    url: "https://invima.gov.co/productos-vigilados/dispositivos-medicos/programa-nacional-de-tecnovigilancia",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Resolución 4002 de 2007 — Almacenamiento",
    url: "https://normograma.invima.gov.co/compilacion/docs/resolucion_minproteccion_4002_2007.htm",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Resolución 3100 de 2019 — Habilitación",
    url: "https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/pdf/resolucion_minsaludps_3100_2019.pdf",
    tipo: "Normativa",
    paginas: null,
  },
  {
    nombre: "Fluke QA-ES III — Analizador de Electrocirugía",
    url: "https://www.flukebiomedical.com/products/electrosurgery-analyzers/qa-es-iii-electrosurgery-analyzer",
    tipo: "Instrumento",
    paginas: null,
  },
  {
    nombre: "Recall Clase I Megadyne — Electrodos de retorno (FDA)",
    url: "https://www.fda.gov/medical-devices/medical-device-recalls-and-early-alerts/megadyne-recalls-mega-2000-and-mega-soft-reusable-patient-return-electrodes-risk-serious-burn",
    tipo: "Seguridad",
    paginas: null,
  },
  {
    nombre: "Guía AORN Seguridad en Electrocirugía (abstract)",
    url: "https://www.proquest.com/docview/2748887307",
    tipo: "Guía clínica",
    paginas: null,
  },
  {
    nombre: "Análisis de Recalls ESU — FDA MAUDE",
    url: "https://meddeviceguide.com/blog/fda-electrosurgical-unit-esu-recall-surgical-fire-maude-teardown",
    tipo: "Seguridad",
    paginas: null,
  },
]

export const CHECKLIST_ITEMS = [
  {
    id: 1,
    category: "Inspección visual",
    item: "Inspección del gabinete, panel frontal y tapa trasera — sin daños físicos ni signos de quemadura",
  },
  {
    id: 2,
    category: "Inspección visual",
    item: "Revisión de cables de alimentación — sin cortes, aplastamientos ni desgaste del aislamiento",
  },
  {
    id: 3,
    category: "Inspección visual",
    item: "Revisión de conectores de electrodo activo y neutro — sin corrosión ni deformación",
  },
  {
    id: 4,
    category: "Inspección visual",
    item: "Limpieza externa del panel y rejillas de ventilación",
  },
  {
    id: 5,
    category: "Pruebas eléctricas de seguridad (IEC 62353)",
    item: "Medición de resistencia de tierra de protección (RP < 0.1 Ω)",
  },
  {
    id: 6,
    category: "Pruebas eléctricas de seguridad (IEC 62353)",
    item: "Medición de corriente de fuga al chasis (< 300 µA)",
  },
  {
    id: 7,
    category: "Pruebas eléctricas de seguridad (IEC 62353)",
    item: "Medición de corriente de fuga al paciente (< 10 µA)",
  },
  {
    id: 8,
    category: "Pruebas eléctricas de seguridad (IEC 62353)",
    item: "Medición de tensión de alimentación (120 V ± 10%)",
  },
  {
    id: 9,
    category: "Verificación funcional",
    item: "Prueba de alarma REM (electrodo neutro desconectado): alarma debe activarse",
  },
  {
    id: 10,
    category: "Verificación funcional",
    item: "Verificación de potencia de salida modo Corte (medir con QA-ES III o equivalente)",
  },
  {
    id: 11,
    category: "Verificación funcional",
    item: "Verificación de potencia de salida modo Coagulación",
  },
  {
    id: 12,
    category: "Verificación funcional",
    item: "Prueba de pedal de control — respuesta correcta en corte y coagulación",
  },
  {
    id: 13,
    category: "Verificación funcional",
    item: "Prueba de activación bipolar",
  },
  {
    id: 14,
    category: "Accesorios y consumibles",
    item: "Verificación de estado de electrodos activos en stock",
  },
  {
    id: 15,
    category: "Accesorios y consumibles",
    item: "Verificación de placas de retorno — fecha de vencimiento y cantidad disponible",
  },
]
