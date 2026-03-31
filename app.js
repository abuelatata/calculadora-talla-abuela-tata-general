const TALLAS_EXCLUIDAS = ["7", "9", "11"];

function tallaPermitida(talla) {
  const t = String(talla).toLowerCase().trim();
  return !TALLAS_EXCLUIDAS.some(x => t === x || t.startsWith(x + " ") || t.startsWith(x + "a"));
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
    console.error(error);
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
  if (!item) return null;
  if (item.aliasOf) return MEDIDAS[item.aliasOf];
  return item;
}

function renderPrenda() {
  const itemOriginal = MEDIDAS[PRENDA_ACTUAL];
  const item = resolveItem(PRENDA_ACTUAL);

  if (!itemOriginal || !item) {
    estadoPrenda.textContent = "Prenda no disponible.";
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
    label.textContent = field.label;
    label.setAttribute("for", field.key);

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.step = "0.1";
    input.id = field.key;
    input.placeholder = `Introduce ${field.label.toLowerCase()}`;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    medidasForm.appendChild(wrapper);
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

function getValoresIntroducidos(fields) {
  const valores = {};
  fields.forEach(field => {
    const val = parseFloat(document.getElementById(field.key).value);
    if (!isNaN(val)) valores[field.key] = val;
  });
  return valores;
}

function getPesoCampo(key) {
  switch (key) {
    case "pecho": return 5;
    case "cintura": return 4;
    case "talle": return 3;
    case "espalda": return 2.5;
    case "cont_manga": return 1.5;
    case "l_falda": return 1;
    case "l_total": return 1;
    case "l_manga": return 1.5;
    case "l_camisa": return 1;
    case "cadera": return 3;
    case "largo": return 1;
    default: return 1;
  }
}

function calcularTalla() {
  const item = resolveItem(PRENDA_ACTUAL);
  if (!item) return;

  const valores = getValoresIntroducidos(item.fields);

  if (Object.keys(valores).length === 0) {
    resultado.className = "resultado";
    resultado.innerHTML = "Debes introducir al menos una medida.";
    detalleComparacion.innerHTML = "";
    return;
  }

  let tallasDisponibles = item.sizes.filter(size => tallaPermitida(size.talla));

  // REGLA MAESTRA:
  // si hay pecho introducido, la talla elegida debe tener al menos pecho + 2 cm
  if (typeof valores.pecho === "number") {
    const pechoMinimoPrenda = valores.pecho + 2;
    const tallasValidasPorPecho = tallasDisponibles.filter(size => Number(size.pecho) >= pechoMinimoPrenda);

    if (tallasValidasPorPecho.length > 0) {
      tallasDisponibles = tallasValidasPorPecho;
    }
  }

  let mejor = null;
  let mejorScore = Infinity;
  let mejorDetalle = [];

  tallasDisponibles.forEach(size => {
    let score = 0;
    let detalle = [];

    Object.keys(valores).forEach(key => {
      const valorCliente = valores[key];
      const valorTabla = Number(size[key]);

      if (isNaN(valorTabla)) return;

      let valorComparacion = valorCliente;
      if (key === "pecho") {
        valorComparacion = valorCliente + 2;
      }

      const diferencia = Math.abs(valorComparacion - valorTabla);
      const peso = getPesoCampo(key);
      const diferenciaPonderada = diferencia * peso;

      score += diferenciaPonderada;

      detalle.push({
        campo: key,
        introducido: valorCliente,
        comparado: valorComparacion,
        tabla: valorTabla,
        diferencia: diferencia,
        peso: peso
      });
    });

    if (score < mejorScore) {
      mejorScore = score;
      mejor = size;
      mejorDetalle = detalle;
    }
  });

  if (!mejor) {
    resultado.className = "resultado";
    resultado.innerHTML = "No se ha podido calcular la talla.";
    detalleComparacion.innerHTML = "";
    return;
  }

  resultado.className = "resultado";
  resultado.innerHTML = `
    Talla recomendada: <strong>${mejor.talla}</strong>
    <br><br>
    <small>
      La talla recomendada se ha calculado aplicando una holgura fija de 2 cm en el contorno de pecho,
      ya que las medidas corresponden a prendas terminadas.
      <br><br>
      Las medidas pueden variar ligeramente en función del diseño del modelo
      y del comportamiento de los tejidos.
    </small>
  `;

  renderDetalle(mejorDetalle);
}

function nombreCampoBonito(key) {
  const mapa = {
    pecho: "Pecho",
    cintura: "Cintura",
    talle: "Talle",
    espalda: "Espalda",
    cont_manga: "Contorno manga",
    l_falda: "Largo falda",
    l_total: "Largo total",
    l_manga: "Largo manga",
    l_camisa: "Largo camisa",
    cadera: "Cadera",
    largo: "Largo"
  };
  return mapa[key] || key;
}

function renderDetalle(detalle) {
  if (!detalle || !detalle.length) {
    detalleComparacion.innerHTML = "";
    return;
  }

  let html = `
    <div style="margin-top:12px;">
      <div class="table-wrap">
        <table class="tabla">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Cliente</th>
              <th>Comparación</th>
              <th>Tabla</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
  `;

  detalle.forEach(d => {
    html += `
      <tr>
        <td>${nombreCampoBonito(d.campo)}</td>
        <td>${d.introducido}</td>
        <td>${d.comparado}</td>
        <td>${d.tabla}</td>
        <td>${d.diferencia}</td>
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
  medidasForm.querySelectorAll("input").forEach(input => {
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
