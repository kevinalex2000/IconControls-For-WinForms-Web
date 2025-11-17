// Ruta al CSV relativo al index.html
const CSV_PATH = "data/icons.csv";
const PAGE_SIZE = 35;

let allRows = []; // rows tal como devuelve parseCSV (array de arrays)
let currentPage = 1;

// Parseo CSV simple (maneja comillas dobles y comas)
function parseCSV(text) {
  // separar líneas (mantener líneas no vacías)
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  return lines.map((l) => l.split("\t"));
}

// Descomilla un campo CSV si está entre comillas
function unquoteField(s) {
  if (!s) return "";
  s = s.toString().trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  return s;
}

// Extrae objeto {type,name,code} desde una fila del CSV (cols array)
function parseRow(cols) {
  if (Array.isArray(cols) && cols.length === 1 && typeof cols[0] === "string") {
    const raw = cols[0];
    const parts = raw.split("\t");
    if (parts.length > 1) cols = parts;
  }
  const type = unquoteField((cols[0] || "").toString()).trim();
  const name = unquoteField((cols[1] || "").toString()).trim();
  const codeRaw = Array.isArray(cols) ? cols.slice(2).join("\t") : "";
  const code = unquoteField(codeRaw);
  return { type, name, code };
}

// Crea un elemento de icono a partir de type, name y code
function createIconElement(type, name, code) {
  const col = document.createElement("div");
  col.className = "col icon-item";
  col.dataset.name = name;
  col.dataset.type = type;

  const card = document.createElement("div");
  card.className = "icon-card";

  const preview = document.createElement("div");
  preview.className = "icon-preview";

  const trimmed = (code || "").trim();

  if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(trimmed)) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (svg) {
        const imported = document.importNode(svg, true);
        if (
          !imported.getAttribute("width") &&
          !imported.getAttribute("height")
        ) {
          imported.setAttribute("width", "48");
          imported.setAttribute("height", "48");
        }
        imported.style.display = "block";
        imported.style.margin = "0 auto";
        preview.appendChild(imported);
      } else {
        preview.innerHTML = trimmed;
      }
    } catch (e) {
      console.warn("Error parseando SVG:", e);
      preview.innerHTML = trimmed;
    }
  } else if (
    trimmed.startsWith("&#") ||
    /<[^>]+>/.test(trimmed) ||
    /[\u{1F300}-\u{1F6FF}]/u.test(trimmed)
  ) {
    preview.innerHTML = trimmed;
  } else {
    preview.textContent = trimmed;
  }

  const title = document.createElement("div");
  title.textContent = name;
  title.className = "title";

  const subtitle = document.createElement("div");
  subtitle.textContent = type.toLowerCase();
  subtitle.className = "subtitle";

  card.appendChild(preview);
  card.appendChild(subtitle);
  card.appendChild(title);

  // Al hacer clic copia el nombre del icono
  card.addEventListener("click", () => {
    navigator.clipboard
      .writeText(name)
      .then(showCopyToast)
      .catch((err) => console.error("No se pudo copiar:", err));
  });

  col.appendChild(card);
  return col;
}

// Renderiza los iconos de la página actual con la fila filtrada
function render() {
  const container = document.getElementById("iconContainer");
  container.innerHTML = "";

  const query = (document.getElementById("filterInput").value || "")
    .toLowerCase()
    .trim();

  // Mapear todas las filas a objetos y filtrar
  const parsed = allRows.map(parseRow).filter((r) => r.name);
  const filtered = parsed.filter((r) => {
    if (!query) return true;
    return (
      (r.name || "").toLowerCase().includes(query) ||
      (r.type || "").toLowerCase().includes(query)
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  pageItems.forEach((it) => {
    const el = createIconElement(it.type, it.name, it.code);
    container.appendChild(el);
  });

  renderPagination(total, totalPages);
}

// Renderiza controles de paginación simples
function renderPagination(totalItems, totalPages) {
  const nav = document.getElementById("paginationNav");
  nav.innerHTML = "";
  if (totalItems === 0) return;

  const ul = document.createElement("ul");
  ul.className = "pagination justify-content-center";

  // Prev
  const prevLi = document.createElement("li");
  prevLi.className = "page-item " + (currentPage === 1 ? "disabled" : "");
  const prevA = document.createElement("a");
  prevA.className = "page-link";
  prevA.href = "#";
  prevA.textContent = "Anterior";
  prevA.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      render();
    }
  });
  prevLi.appendChild(prevA);
  ul.appendChild(prevLi);

  // Páginas: mostrar hasta 7 botones (centrando la página actual)
  const maxButtons = 7;
  let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  if (start > 1) {
    ul.appendChild(createPageButton(1));
    if (start > 2) {
      const ell = document.createElement("li");
      ell.className = "page-item disabled";
      const ellA = document.createElement("span");
      ellA.className = "page-link";
      ellA.textContent = "…";
      ell.appendChild(ellA);
      ul.appendChild(ell);
    }
  }

  for (let p = start; p <= end; p++) {
    ul.appendChild(createPageButton(p));
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const ell = document.createElement("li");
      ell.className = "page-item disabled";
      const ellA = document.createElement("span");
      ellA.className = "page-link";
      ellA.textContent = "…";
      ell.appendChild(ellA);
      ul.appendChild(ell);
    }
    ul.appendChild(createPageButton(totalPages));
  }

  // Next
  const nextLi = document.createElement("li");
  nextLi.className =
    "page-item " + (currentPage === totalPages ? "disabled" : "");
  const nextA = document.createElement("button");
  nextA.className = "page-link";
  nextA.textContent = "Siguiente";
  nextA.addEventListener("click", (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      render();
    }
  });
  nextLi.appendChild(nextA);
  ul.appendChild(nextLi);

  // Info
  const info = document.createElement("div");
  info.className = "text-center mt-2";
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(totalItems, currentPage * PAGE_SIZE);
  info.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems}`;

  nav.appendChild(ul);
  nav.appendChild(info);
}

function createPageButton(p) {
  const li = document.createElement("li");
  li.className = "page-item " + (p === currentPage ? "active" : "");
  const a = document.createElement("button");
  a.className = "page-link";
  a.textContent = p;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    if (p === currentPage) return;
    currentPage = p;
    render();
  });
  li.appendChild(a);
  return li;
}

function showCopyToast() {
  const copyToast = document.getElementById("copyToast");
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(copyToast);
  toastBootstrap.show();
}

// Filtro dinámico (usa render para recalcular)
const filterInput = document.getElementById("filterInput");
filterInput.addEventListener("input", function () {
  currentPage = 1;
  render();
});

// Cargar CSV y poblar al iniciar
window.addEventListener("DOMContentLoaded", () => {
  fetch(CSV_PATH)
    .then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar " + CSV_PATH);
      return res.text();
    })
    .then((text) => {
      allRows = parseCSV(text);
      currentPage = 1;
      render();
    })
    .catch((err) => {
      console.error(err);
      const container = document.getElementById("iconContainer");
      container.innerHTML =
        '<div class="col-12"><div class="alert alert-danger">No se pudo cargar data/icons.csv — asegúrate de servir el sitio desde un servidor (no desde file://) y que el archivo exista.</div></div>';
    });
});

document.getElementById("year").textContent = new Date().getFullYear();
