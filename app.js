// 🔒 TALLAS QUE NO TRABAJAMOS
const TALLAS_EXCLUIDAS = ["7", "9", "11"];

function tallaPermitida(talla) {
  return !TALLAS_EXCLUIDAS.some(t => talla.includes(t));
}

let MEDIDAS = {};
let PRENDA_ACTUAL = null;

const prendaSelect = document.getElementById("prendaSelect");
const estadoPrenda = document.getElementById("estadoPrenda");
const medidasForm = document.getElementById("medidasForm");
const calcularBtn = document.getElementById("calcularBtn");
const limpiarBtn = document.getElementById("limpiarBtn");
const resultado = document.getElementById("resultado");
const detalleComparacion = document.getElementById("detalleComparacion");
const tablaHead = document.getElementById("tablaHead");
const tablaBody = document.getElementById("tablaBody");

init();

async function init() {
  try {
    const res = await fetch("./data/medidas.json");
    const data = await res.json();
    MEDIDAS = data.items || {};
    cargarSelector();
  } catch (error) {
    estadoPrenda.textContent = "Error cargando datos.";
  }
}

function cargarSelector() {
  prendaSelect.innerHTML = "";

  Object.keys(MEDIDAS).forEach((key) => {
    const item = MEDIDAS[key];
    if (!item || item.status !== "active") return;

    const option = document.createElement("option");
    option.value = key;
    option.textContent = item.label;
    prendaSelect.appendChild(option);
  });

  prendaSelect.addEventListener("change", () => {
    PRENDA_ACTUAL = prendaSelect.value;
    renderPrenda();
  });

  PRENDA_ACTUAL = prendaSelect.value;
  renderPrenda();
}

function resolveItem(key) {
  const item = MEDIDAS[key];
  if (item.aliasOf) return MEDIDAS[item.aliasOf];
  return item;
}

function renderPrenda() {
  const itemOriginal = MEDIDAS[PRENDA_ACTUAL];
  const item = resolveItem(PRENDA_ACTUAL);

  estadoPrenda.textContent = itemOriginal.aliasOf
    ? `${itemOriginal.label} usa el mismo tallaje que ${MEDIDAS[itemOriginal.aliasOf].label}`
    : `Tabla activa: ${itemOriginal.label}`;

  renderCampos(item.fields);
  renderTabla(item);
  resetResultado();
}

function renderCampos(fields) {
  medidasForm.innerHTML = "";

  fields.forEach((field) => {
    const label = document.createElement("label");
    label.className = "label";
    label.textContent = field.label;

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.id = field.key;

    medidasForm.appendChild(label);
    medidasForm.appendChild(input);
  });
}

function renderTabla(item) {
  tablaHead.innerHTML = "";
  tablaBody.innerHTML = "";

  const headers = ["Talla", ...item.fields.map(f => f.label)];

  const trHead = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trHead.appendChild(th);
  });

  tablaHead.appendChild(trHead);

  item.sizes
    .filter(size => tallaPermitida(size.talla))
    .forEach(size => {
      const tr = document.createElement("tr");

      const tdTalla = document.createElement("td");
      tdTalla.textContent = size.talla;
      tr.appendChild(tdTalla);

      item.fields.forEach(field => {
        const td = document.createElement("td");
        td.textContent = size[field.key] ?? "-";
        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });
}

function calcularTalla() {
  const item = resolveItem(PRENDA_ACTUAL);
  const valores = {};

  item.fields.forEach(field => {
    const val = parseFloat(document.getElementById(field.key).value);
    if (!isNaN(val)) valores[field.key] = val;
  });

  if (Object.keys(valores).length === 0) {
    resultado.innerHTML = "Debes introducir al menos una medida.";
    return;
  }

  let mejor = null;
  let mejorScore = Infinity;
  let detalle = [];

  item.sizes
    .filter(size => tallaPermitida(size.talla))
    .forEach(size => {

      let score = 0;
      let tempDetalle = [];

      Object.keys(valores).forEach(key => {

        let valorAjustado = valores[key];

        // 🔥 HOLGURA FIJA
        if (key === "pecho") {
          valorAjustado = valores[key] + 2;
        }

        const diff = Math.abs(valorAjustado - size[key]);
        score += diff;

        tempDetalle.push({
          campo: key,
          introducido: valores[key],
          tabla: size[key],
          diferencia: diff
        });
      });

      if (score < mejorScore) {
        mejorScore = score;
        mejor = size;
        detalle = tempDetalle;
      }
    });

  resultado.innerHTML = `
  Talla recomendada: <strong>${mejor.talla}</strong>
  <br><br>
  <small>
  La talla recomendada se ha calculado aplicando una holgura de 2 cm en el contorno de pecho, 
  teniendo en cuenta que las medidas corresponden a prendas terminadas.<br><br>
  Las medidas pueden variar ligeramente en función del diseño del modelo 
  y del comportamiento de los tejidos.
  </small>
  `;

  renderDetalle(detalle);
}

function renderDetalle(detalle) {
  let html = "<table class='tabla'><tr><th>Campo</th><th>Cliente</th><th>Tabla</th><th>Diferencia</th></tr>";

  detalle.forEach(d => {
    html += `<tr>
      <td>${d.campo}</td>
      <td>${d.introducido}</td>
      <td>${d.tabla}</td>
      <td>${d.diferencia}</td>
    </tr>`;
  });

  html += "</table>";
  detalleComparacion.innerHTML = html;
}

function limpiarFormulario() {
  document.querySelectorAll("input").forEach(i => i.value = "");
  resetResultado();
}

function resetResultado() {
  resultado.textContent = "Aún no se ha calculado ninguna talla.";
  detalleComparacion.innerHTML = "";
}

calcularBtn.addEventListener("click", calcularTalla);
limpiarBtn.addEventListener("click", limpiarFormulario);
