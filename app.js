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
    console.error("Error cargando medidas.json:", error);
    estadoPrenda.textContent = "No se pudo cargar la tabla de medidas.";
  }
}

function cargarSelector() {
  prendaSelect.innerHTML = "";

  const keys = Object.keys(MEDIDAS).filter((key) => {
    return !Array.isArray(MEDIDAS[key]);
  });

  keys.forEach((key) => {
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
  if (!item) return null;

  if (item.aliasOf) {
    return MEDIDAS[item.aliasOf];
  }

  return item;
}

function renderPrenda() {
  const itemOriginal = MEDIDAS[PRENDA_ACTUAL];
  const item = resolveItem(PRENDA_ACTUAL);

  if (!itemOriginal || !item) {
    estadoPrenda.textContent = "Prenda no disponible.";
    medidasForm.innerHTML = "";
    tablaHead.innerHTML = "";
    tablaBody.innerHTML = "";
    return;
  }

  estadoPrenda.textContent = itemOriginal.aliasOf
    ? `${itemOriginal.label} usa el mismo tallaje que ${MEDIDAS[itemOriginal.aliasOf].label}.`
    : `Tabla activa: ${itemOriginal.label}`;

  renderCampos(item.fields);
  renderTabla(item);
  resetResultado();
}

function renderCampos(fields) {
  medidasForm.innerHTML = "";

  fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field-group";

    const label = document.createElement("label");
    label.className = "label";
    label.setAttribute("for", field.key);
    label.textContent = field.label;

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.step = "0.1";
    input.id = field.key;
    input.name = field.key;
    input.placeholder = `Introduce ${field.label.toLowerCase()}`;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    medidasForm.appendChild(wrapper);
  });
}

function renderTabla(item) {
  tablaHead.innerHTML = "";
  tablaBody.innerHTML = "";

  const headers = ["Talla", ...item.fields.map((f) => f.label)];

  const trHead = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    trHead.appendChild(th);
  });
  tablaHead.appendChild(trHead);

  item.sizes.forEach((sizeRow) => {
    const tr = document.createElement("tr");

    const tdTalla = document.createElement("td");
    tdTalla.textContent = sizeRow.talla;
    tr.appendChild(tdTalla);

    item.fields.forEach((field) => {
      const td = document.createElement("td");
      td.textContent =
        sizeRow[field.key] !== undefined ? sizeRow[field.key] : "-";
      tr.appendChild(td);
    });

    tablaBody.appendChild(tr);
  });
}

function getValoresFormulario(fields) {
  const valores = {};

  fields.forEach((field) => {
    const input = document.getElementById(field.key);
    const value = parseFloat(input.value);

    if (!isNaN(value)) {
      valores[field.key] = value;
    }
  });

  return valores;
}

function calcularTalla() {
  const item = resolveItem(PRENDA_ACTUAL);

  if (!item) return;

  const valores = getValoresFormulario(item.fields);
  const keys = Object.keys(valores);

  if (keys.length === 0) {
    resultado.className = "resultado";
    resultado.innerHTML = "Debes introducir al menos una medida.";
    detalleComparacion.innerHTML = "";
    return;
  }

  let mejorTalla = null;
  let mejorScore = Infinity;
  let mejorDetalle = null;

  item.sizes.forEach((sizeRow) => {
    let score = 0;
    let detalle = [];

    keys.forEach((key) => {
      const diferencia = Math.abs(valores[key] - sizeRow[key]);
      score += diferencia;
      detalle.push({
        campo: item.fields.find((f) => f.key === key)?.label || key,
        introducido: valores[key],
        tabla: sizeRow[key],
        diferencia: diferencia
      });
    });

    if (score < mejorScore) {
      mejorScore = score;
      mejorTalla = sizeRow;
      mejorDetalle = detalle;
    }
  });

  resultado.className = "resultado";
  resultado.innerHTML = `Talla recomendada: <strong>${mejorTalla.talla}</strong>`;

  renderDetalle(mejorDetalle);
}

function renderDetalle(detalle) {
  if (!detalle || !detalle.length) {
    detalleComparacion.innerHTML = "";
    return;
  }

  let html = `
    <div style="margin-top:12px;">
      <h4 style="margin-bottom:10px;">Comparación de medidas</h4>
      <div class="table-wrap">
        <table class="tabla">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Introducido</th>
              <th>Tabla</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
  `;

  detalle.forEach((item) => {
    html += `
      <tr>
        <td>${item.campo}</td>
        <td>${item.introducido}</td>
        <td>${item.tabla}</td>
        <td>${item.diferencia}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  detalleComparacion.innerHTML = html;
}

function limpiarFormulario() {
  const inputs = medidasForm.querySelectorAll("input");
  inputs.forEach((input) => {
    input.value = "";
  });
  resetResultado();
}

function resetResultado() {
  resultado.className = "resultado resultado--empty";
  resultado.textContent = "Aún no se ha calculado ninguna talla.";
  detalleComparacion.innerHTML = "";
}

calcularBtn.addEventListener("click", calcularTalla);
limpiarBtn.addEventListener("click", limpiarFormulario);
