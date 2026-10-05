const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let equipo=LS.get("equipo",null), inv=LS.get("inventario",null), checks=LS.get("checks",null), hist=LS.get("historial",[]), alarms=[], kb=[], specs=null;

async function loadData(){[equipo,inv,checks,alarms,kb,specs]=await Promise.all([
 fetch("data/equipo.json").then(r=>r.json()),fetch("data/inventario.json").then(r=>r.json()),fetch("data/checklist.json").then(r=>r.json()),fetch("data/alarmas_force_fx_c.json").then(r=>r.json()),fetch("data/base_conocimiento.json").then(r=>r.json()),fetch("data/pruebas_force_fx_c.json").then(r=>r.json())]);
 equipo=LS.get("equipo",equipo);inv=LS.get("inventario",inv);checks=LS.get("checks",checks);
 renderAll();
}
function nav(){ $$("#inicio,#hoja,#inventario,#mantenimiento,#checklist,#dashboard,#ia,#reportes").forEach(x=>x.classList.remove("active")); const v=location.hash.slice(1)||"inicio"; $("#"+v)?.classList.add("active");}
$$("nav button").forEach(b=>b.onclick=()=>{location.hash=b.dataset.view;nav()}); window.onhashchange=nav;

function renderAll(){
 $("#homeEquipo").textContent=`${equipo.marca} ${equipo.modelo}`;
 $("#homeEstado").textContent=equipo.estado;
 $("#homeChecklist").textContent=`${checks.filter(x=>x.resultado==="OK").length}/${checks.length} OK`;
 $("#homeHistorial").textContent=`${hist.length} registros`;
 $("#equipoForm").innerHTML=Object.entries(equipo).filter(([k])=>!["id","qr_url"].includes(k)).map(([k,v])=>`<label>${k}<input name="${k}" value="${String(v??"").replaceAll('"',"&quot;")}"></label>`).join("");
 $("#inventoryTable").innerHTML=`<table><thead><tr><th>Elemento</th><th>Categoría</th><th>Cantidad</th><th>Estado</th><th>Serial</th><th>Observaciones</th></tr></thead><tbody>${inv.map((x,i)=>`<tr><td>${x.nombre}</td><td>${x.categoria}</td><td><input data-i="${i}" data-k="cantidad" value="${x.cantidad}"></td><td><select data-i="${i}" data-k="estado"><option ${x.estado==="Operativo"?"selected":""}>Operativo</option><option ${x.estado==="Por inspeccionar"?"selected":""}>Por inspeccionar</option><option ${x.estado==="Fuera de servicio"?"selected":""}>Fuera de servicio</option></select></td><td><input data-i="${i}" data-k="serial" value="${x.serial}"></td><td><input data-i="${i}" data-k="observaciones" value="${x.observaciones}"></td></tr>`).join("")}</tbody></table>`;
 $("#checklistBox").innerHTML=checks.map((x,i)=>`<div class="check"><b>${x.grupo}</b><div>${x.item}</div><select data-ci="${i}" class="cres"><option value="">Pendiente</option><option ${x.resultado==="OK"?"selected":""}>OK</option><option ${x.resultado==="NO OK"?"selected":""}>NO OK</option><option ${x.resultado==="N/A"?"selected":""}>N/A</option></select><input data-co="${i}" placeholder="Observación" value="${x.observacion||""}"></div>`).join("");
 $("#history").innerHTML=hist.length?`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${hist.map(x=>`<tr><td>${x.fecha}</td><td>${x.tipo}</td><td>${x.tecnico}</td><td>${x.estado}</td><td>${x.accion}</td></tr>`).join("")}</tbody></table>`:"<p>No hay mantenimientos registrados.</p>";
 dashboard(); renderReport();
}
$("#saveEquipo").onclick=()=>{const f=new FormData($("#equipoForm")); equipo={...equipo,...Object.fromEntries(f.entries())};LS.set("equipo",equipo);renderAll();alert("Hoja de vida guardada.")};
$("#inventoryTable").addEventListener("input",e=>{const i=e.target.dataset.i,k=e.target.dataset.k;if(i!==undefined){inv[i][k]=e.target.value;LS.set("inventario",inv)}});
$("#inventoryTable").addEventListener("change",e=>{const i=e.target.dataset.i,k=e.target.dataset.k;if(i!==undefined){inv[i][k]=e.target.value;LS.set("inventario",inv)}});
$("#addInventory").onclick=()=>{inv.push({id:"ACC-"+String(inv.length+1).padStart(3,"0"),categoria:"Otro",nombre:"Nuevo elemento",cantidad:1,estado:"Por inspeccionar",serial:"",observaciones:""});LS.set("inventario",inv);renderAll()};
$("#saveMaint").onclick=()=>{const f=Object.fromEntries(new FormData($("#maintForm")));hist.push(f);LS.set("historial",hist);$("#maintForm").reset();renderAll();alert("Mantenimiento guardado.")};
$("#saveChecklist").onclick=()=>{$$(".cres").forEach((s,i)=>checks[i].resultado=s.value);$$("[data-co]").forEach(x=>checks[x.dataset.co].observacion=x.value);LS.set("checks",checks);renderAll();alert("Checklist guardado.")};

function dashboard(){
 const total=hist.length, fails=hist.filter(x=>x.estado==="Fuera de servicio").length, pm=hist.filter(x=>x.tipo==="Preventivo").length;
 $("#availability").textContent=total?`${Math.max(0,100-fails*10)}%`:"0%";
 $("#mtbf").textContent=total?`${(720/Math.max(1,fails)).toFixed(1)} h`:"0 h";
 $("#mttr").textContent=total?`${(fails?8:0).toFixed(1)} h`:"0 h";
 $("#pm").textContent=total?`${Math.round(pm/total*100)}%`:"0%";
 const ctx=$("#maintChart"); if(window.mc)window.mc.destroy(); window.mc=new Chart(ctx,{type:"bar",data:{labels:["Preventivo","Correctivo","Predictivo"],datasets:[{label:"Registros",data:[hist.filter(x=>x.tipo==="Preventivo").length,hist.filter(x=>x.tipo==="Correctivo").length,hist.filter(x=>x.tipo==="Predictivo").length]}]}}});
}

$("#chatForm").onsubmit=e=>{e.preventDefault();const q=$("#question").value.trim();addChat("Usuario",q,"user");const answer=answerLocal(q);addChat("Electro Safe",answer,"assistant");$("#question").value=""};
function addChat(who,text,cl){$("#chat").insertAdjacentHTML("beforeend",`<div class="chatmsg ${cl}"><small>${who}</small>${text}</div>`)}
function answerLocal(q){
 const norm=q.toLowerCase(); const m=norm.match(/\b(\d{1,3})\b/); if(m){const a=alarms.find(x=>String(x.code)===m[1]);if(a)return `<b>Alarma ${a.code}</b><br>${a.description}<br><br><b>Acción indicada:</b> ${a.action}<br><br><span class="small">Fuente: Service Manual Force FX-C, sección 6.</span>`}
 let best=kb.map(x=>({x,score:x.keywords.reduce((s,k)=>s+(norm.includes(k.toLowerCase())?1:0),0)})).sort((a,b)=>b.score-a.score)[0];
 return best&&best.score?`${best.x.answer}<br><br><span class="small">Fuente: base documental Electro Safe.</span>`:"No encontré una respuesta respaldada por la base documental cargada. No se genera una recomendación técnica fuera del manual.";
}

$("#startQr").onclick=async()=>{const qr=new Html5Qrcode("qr-reader");$("#qrResult").textContent="Solicitando cámara…";try{await qr.start({facingMode:"environment"},{fps:10,qrbox:220},text=>{try{const u=new URL(text);const id=u.searchParams.get("equipo");$("#qrResult").textContent=id?`Equipo identificado: ${id}`:`QR leído: ${text}`;}catch{$("#qrResult").textContent=`QR leído: ${text}`}},()=>{});}catch(e){$("#qrResult").textContent="No fue posible abrir la cámara. Usa un QR desde otro dispositivo o prueba en HTTPS."}};

function renderReport(){$("#reportPreview").innerHTML=`<h3>${equipo.marca} ${equipo.modelo}</h3><p>Estado: ${equipo.estado} · Serie: ${equipo.numero_serie||"No diligenciada"}</p><p>Checklist OK: ${checks.filter(x=>x.resultado==="OK").length}/${checks.length}</p><p>Mantenimientos: ${hist.length}</p>`}
$("#pdfBtn").onclick=()=>{const {jsPDF}=window.jspdf;const doc=new jsPDF();let y=18;doc.setFontSize(16);doc.text("Electro Safe — Reporte técnico",15,y);y+=10;doc.setFontSize(10);["Marca","Modelo","Serie","Servicio","Ubicación","Estado"].forEach(k=>{const map={Marca:equipo.marca,Modelo:equipo.modelo,Serie:equipo.numero_serie,Servicio:equipo.servicio,Ubicación:equipo.ubicacion,Estado:equipo.estado};doc.text(`${k}: ${map[k]||"No diligenciado"}`,15,y);y+=6});y+=5;doc.text("Checklist:",15,y);y+=6;checks.slice(0,18).forEach(x=>{doc.text(`${x.id} ${x.resultado||"Pendiente"} - ${x.item}`.slice(0,110),15,y);y+=5;if(y>280){doc.addPage();y=18}});y+=5;doc.text(`Mantenimientos registrados: ${hist.length}`,15,y);doc.save("ElectroSafe_Reporte_ForceFXC.pdf")};

loadData();nav();
