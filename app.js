const TALLAS_EXCLUIDAS = ["7", "9", "11"];

let MEDIDAS = {};
let PRENDA_ACTUAL = null;

const prendaSelect = document.getElementById("prendaSelect");
const estadoPrenda = document.getElementById("estadoPrenda");
const campos = document.getElementById("campos");
const resultado = document.getElementById("resultado");
const detalleComparacion = document.getElementById("detalleComparacion");
const tablaHead = document.getElementById("tablaHead");
const tablaBody = document.getElementById("tablaBody");
const calcularBtn = document.getElementById("calcularBtn");
const limpiarBtn = document.getElementById("limpiarBtn");

init();

async function init() {
  try {
    const res = await fetch("./data/medidas.json");
    const data = await res.json();
    MEDIDAS = data.items || {};
    cargarSelector();
  } catch (error) {
    console.error(error);
    estadoPrenda.textContent = "Error cargando la tabla de medidas.";
  }
}

function normalizarTalla(talla) {
  return String(talla).toLowerCase().trim();
}

function tallaPermitida(talla) {
  const t = normalizarTalla(talla);
  return !TALLAS_EXCLUIDAS.some(excluida =>
    t === excluida ||
    t === `${excluida} años` ||
    t === `${excluida} año` ||
    t === `${excluida}a`
  );
}

function resolveItem(key) {
  const item = MEDIDAS[key];
  if (!item) return null;
  if (item.aliasOf) return MEDIDAS[item.aliasOf];
  return item;
}

function getReglaPrincipal(prendaKey) {
  switch (prendaKey) {
    case "vestido":
    case "jesusito":
      return {
        campo: "pecho",
        holgura: 2,
        descripcion: "La talla se calcula automaticamente con una holgura 2 cm en el pecho ."
      };

    case "camisa":
      return {
        campo: "pecho",
        holgura: 2,
        descripcion: "La talla se calcula principalmente por contorno/pecho con 2 cm de holgura."
      };

    case "pantalon_43":
    case "pantalon_20":
    case "braguita_20":
      return {
        campo: "cintura",
        holgura: 0,
        descripcion: "La talla se calcula principalmente por cintura."
      };

    default:
      return {
        campo: null,
        holgura: 0,
        descripcion: ""
      };
  }
}

function getPesoCampo(prendaKey, key) {
  if (prendaKey === "vestido" || prendaKey === "jesusito") {
    switch (key) {
      case "pecho": return 10;
      case "cintura": return 4;
      case "talle": return 3;
      case "espalda": return 2;
      case "cont_manga": return 1;
      case "l_falda": return 0.5;
      case "l_total": return 0.5;
      default: return 1;
    }
  }

  if (prendaKey === "camisa") {
    switch (key) {
      case "pecho": return 10;
      case "l_manga": return 2;
      case "l_camisa": return 1;
      default: return 1;
    }
  }

  if (["pantalon_43", "pantalon_20", "braguita_20"].includes(prendaKey)) {
    switch (key) {
      case "cintura": return 10;
      case "cadera": return 3;
      case "largo": return 1;
      default: return 1;
    }
  }

  return 1;
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

  PRENDA_ACTUAL = prendaSelect.value;
  prendaSelect.addEventListener("change", () => {
    PRENDA_ACTUAL = prendaSelect.value;
    renderPrenda();
  });

  renderPrenda();
}

function renderPrenda() {
  const itemOriginal = MEDIDAS[PRENDA_ACTUAL];
  const item = resolveItem(PRENDA_ACTUAL);

  if (!itemOriginal || !item) {
    estadoPrenda.textContent = "Prenda no disponible.";
    return;
  }

  const regla = getReglaPrincipal(PRENDA_ACTUAL);

  let texto = itemOriginal.aliasOf
    ? `${itemOriginal.label} usa el mismo tallaje que ${MEDIDAS[itemOriginal.aliasOf].label}.`
    : `Tabla activa: ${itemOriginal.label}.`;

  if (regla.descripcion) {
    texto += ` ${regla.descripcion}`;
  }

  estadoPrenda.textContent = texto;

  renderCampos(item.fields);
  renderTabla(item);
  resetResultado();
}

function renderCampos(fields) {
  campos.innerHTML = "";

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
    input.placeholder = `Introduce ${field.label.toLowerCase()}`;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    campos.appendChild(wrapper);
  });
}

function renderTabla(item) {
  tablaHead.innerHTML = "";
  tablaBody.innerHTML = "";

  const headers = ["Talla", ...item.fields.map(f => f.label)];

  const trHead = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    trHead.appendChild(th);
  });
  tablaHead.appendChild(trHead);

  item.sizes
    .filter(size => tallaPermitida(size.talla))
    .forEach((size) => {
      const tr = document.createElement("tr");

      const tdTalla = document.createElement("td");
      tdTalla.textContent = size.talla;
      tr.appendChild(tdTalla);

      item.fields.forEach((field) => {
        const td = document.createElement("td");
        td.textContent = size[field.key] ?? "-";
        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });
}

function getValoresIntroducidos(fields) {
  const valores = {};

  fields.forEach((field) => {
    const input = document.getElementById(field.key);
    if (!input) return;

    const value = parseFloat(input.value);
    if (!isNaN(value)) {
      valores[field.key] = value;
    }
  });

  return valores;
}

function calcularValorAjustado(prendaKey, campo, valor) {
  const regla = getReglaPrincipal(prendaKey);

  if (campo === regla.campo) {
    return valor + regla.holgura;
  }

  return valor;
}

function clasificarAviso(valorAjustado, valorTabla) {
  if (valorTabla < valorAjustado) return "NO LLEGA";
  if (valorTabla > valorAjustado) return "SE PASA";
  return "OK";
}

function construirAvisosSecundarios(detalle, campoPrincipal) {
  const secundarios = detalle.filter(d => d.campo !== campoPrincipal);

  if (!secundarios.length) return "";

  return secundarios.map((d) => {
    if (d.estado === "NO LLEGA") {
      return `${nombreCampoBonito(d.campo)}: no llega en la talla propuesta`;
    }
    if (d.estado === "SE PASA") {
      return `${nombreCampoBonito(d.campo)}: se pasa en la talla propuesta`;
    }
    return `${nombreCampoBonito(d.campo)}: correcto`;
  }).join(" · ");
}

function calcularTalla() {
  const item = resolveItem(PRENDA_ACTUAL);
  if (!item) return;

  const regla = getReglaPrincipal(PRENDA_ACTUAL);
  const valores = getValoresIntroducidos(item.fields);

  if (Object.keys(valores).length === 0) {
    resultado.className = "resultado";
    resultado.innerHTML = "Debes introducir al menos una medida.";
    detalleComparacion.innerHTML = "";
    return;
  }

  let tallasDisponibles = item.sizes.filter(size => tallaPermitida(size.talla));

  if (regla.campo && typeof valores[regla.campo] === "number") {
    const minimoNecesario = valores[regla.campo] + regla.holgura;
    const tallasValidas = tallasDisponibles.filter(size => Number(size[regla.campo]) >= minimoNecesario);

    if (tallasValidas.length > 0) {
      tallasDisponibles = tallasValidas;
    }
  }

  let mejor = null;
  let mejorScore = Infinity;
  let mejorDetalle = [];

  tallasDisponibles.forEach((size) => {
    let score = 0;
    let detalle = [];

    Object.keys(valores).forEach((campo) => {
      const valorCliente = valores[campo];
      const valorTabla = Number(size[campo]);

      if (isNaN(valorTabla)) return;

      const valorAjustado = calcularValorAjustado(PRENDA_ACTUAL, campo, valorCliente);
      const diferencia = Math.abs(valorAjustado - valorTabla);
      const peso = getPesoCampo(PRENDA_ACTUAL, campo);

      score += diferencia * peso;

      detalle.push({
        campo,
        introducido: valorCliente,
        ajustado: valorAjustado,
        tabla: valorTabla,
        diferencia,
        estado: clasificarAviso(valorAjustado, valorTabla)
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

  const avisosSecundarios = construirAvisosSecundarios(mejorDetalle, regla.campo);

  let bloqueHolgura = "";
  if (regla.campo === "pecho") {
    bloqueHolgura = `
      La talla recomendada se ha calculado aplicando una holgura fija de 2 cm en el contorno de pecho,
      ya que las medidas corresponden a prendas terminadas.
      <br><br>
    `;
  }

  let bloqueAvisos = "";
  if (avisosSecundarios) {
    bloqueAvisos = `
      <strong>Avisos de la talla propuesta:</strong><br>
      ${avisosSecundarios}
      <br><br>
    `;
  }

  resultado.className = "resultado";
  resultado.innerHTML = `
    Talla recomendada: <strong>${mejor.talla}</strong>
    <small>
      ${bloqueHolgura}
      ${bloqueAvisos}
      Las medidas pueden variar ligeramente en función del diseño del modelo
      y del comportamiento de los tejidos.
    </small>
  `;

  renderDetalle(mejorDetalle);
}

function renderDetalle(detalle) {
  if (!detalle || !detalle.length) {
    detalleComparacion.innerHTML = "";
    return;
  }

  let html = `
    <div class="table-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Cliente</th>
            <th>Medida ajustada</th>
            <th>Tabla</th>
            <th>Diferencia</th>
            <th>Aviso</th>
          </tr>
        </thead>
        <tbody>
  `;

  detalle.forEach((d) => {
    html += `
      <tr>
        <td>${nombreCampoBonito(d.campo)}</td>
        <td>${d.introducido}</td>
        <td>${d.ajustado}</td>
        <td>${d.tabla}</td>
        <td>${d.diferencia}</td>
        <td>${d.estado}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  detalleComparacion.innerHTML = html;
}

function resetResultado() {
  resultado.className = "resultado resultado--empty";
  resultado.textContent = "Aún no se ha calculado ninguna talla.";
  detalleComparacion.innerHTML = "";
}

function limpiarFormulario() {
  campos.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
  resetResultado();
}

calcularBtn.addEventListener("click", calcularTalla);
limpiarBtn.addEventListener("click", limpiarFormulario);
