const STORAGE_KEY = "tiktok-affiliate-copilot:produtos";
const ROTEIRO_STORAGE_KEY = "tiktok-affiliate-copilot:roteiros";
const RESULTADO_STORAGE_KEY = "tiktok-affiliate-copilot:resultados";
const MODOS_OUMOMO = ["Não definido", "Link to Video", "Viral Remake"];
const COMPARATIVO_COLUNAS = [
  { key: "produtoNome", label: "Produto", tipo: "texto" },
  { key: "anguloOuHook", label: "Ângulo/Hook", tipo: "texto" },
  { key: "modoOumomo", label: "Modo Oumomo", tipo: "texto" },
  { key: "data", label: "Data", tipo: "data" },
  { key: "views", label: "Views", tipo: "numero" },
  { key: "vendas", label: "Vendas", tipo: "numero" },
  { key: "comissaoValor", label: "Comissão (R$)", tipo: "numero" },
  { key: "ctr", label: "CTR (%)", tipo: "numero" },
];

const form = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const nomeInput = document.getElementById("nome");
const categoriaInput = document.getElementById("categoria");
const linkInput = document.getElementById("link");
const comissaoInput = document.getElementById("comissaoPercent");
const precoInput = document.getElementById("preco");
const observacoesInput = document.getElementById("observacoes");

const erroNome = document.getElementById("erro-nome");
const erroCategoria = document.getElementById("erro-categoria");

const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const productList = document.getElementById("product-list");
const productCount = document.getElementById("product-count");
const emptyState = document.getElementById("empty-state");

const comparativoToggleBtn = document.getElementById("comparativo-toggle");
const comparativoContainer = document.getElementById("comparativo-container");

function loadProdutos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Falha ao ler produtos do localStorage:", e);
    return [];
  }
}

function saveProdutos(produtos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
}

function loadRoteiros() {
  try {
    const raw = localStorage.getItem(ROTEIRO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Falha ao ler roteiros do localStorage:", e);
    return [];
  }
}

function saveRoteiros(roteiros) {
  localStorage.setItem(ROTEIRO_STORAGE_KEY, JSON.stringify(roteiros));
}

function loadResultados() {
  try {
    const raw = localStorage.getItem(RESULTADO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Falha ao ler resultados do localStorage:", e);
    return [];
  }
}

function saveResultados(resultados) {
  localStorage.setItem(RESULTADO_STORAGE_KEY, JSON.stringify(resultados));
}

function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "—";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

let produtos = loadProdutos();
let roteiros = loadRoteiros();
let resultados = loadResultados();
let expandedProductIds = new Set();
let expandedRoteiroIds = new Set();
let editingRoteiroId = null;
let editingResultadoId = null;
let comparativoExpanded = false;
let comparativoSort = { coluna: "data", direcao: "desc" };

function renderAll() {
  renderProdutos();
  renderComparativo();
}

function renderProdutos() {
  productList.innerHTML = "";
  productCount.textContent = produtos.length;
  emptyState.hidden = produtos.length > 0;

  produtos
    .slice()
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
    .forEach((produto) => {
      productList.appendChild(renderProdutoCard(produto));
    });
}

function renderProdutoCard(produto) {
  const card = document.createElement("div");
  card.className = "product-card";

  const nomeEl = document.createElement("h3");
  nomeEl.textContent = produto.nome;
  card.appendChild(nomeEl);

  const categoriaEl = document.createElement("span");
  categoriaEl.className = "categoria";
  categoriaEl.textContent = produto.categoria;
  card.appendChild(categoriaEl);

  if (produto.preco !== null && produto.preco !== undefined && produto.preco !== "") {
    const precoEl = document.createElement("div");
    precoEl.className = "meta";
    precoEl.textContent = `Preço: R$ ${Number(produto.preco).toFixed(2)}`;
    card.appendChild(precoEl);
  }

  if (produto.comissaoPercent !== null && produto.comissaoPercent !== undefined && produto.comissaoPercent !== "") {
    const comissaoEl = document.createElement("div");
    comissaoEl.className = "meta";
    comissaoEl.textContent = `Comissão: ${Number(produto.comissaoPercent)}%`;
    card.appendChild(comissaoEl);
  }

  if (produto.link) {
    const linkEl = document.createElement("a");
    linkEl.href = produto.link;
    linkEl.target = "_blank";
    linkEl.rel = "noopener noreferrer";
    linkEl.textContent = produto.link;
    card.appendChild(linkEl);
  }

  if (produto.observacoes) {
    const obsEl = document.createElement("div");
    obsEl.className = "obs";
    obsEl.textContent = produto.observacoes;
    card.appendChild(obsEl);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit";
  editBtn.textContent = "Editar";
  editBtn.addEventListener("click", () => startEdit(produto.id));
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.textContent = "Excluir";
  deleteBtn.addEventListener("click", () => deleteProduto(produto.id));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);

  const roteirosDoProduto = roteiros.filter((r) => r.produtoId === produto.id);
  const isExpanded = expandedProductIds.has(produto.id);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "btn-toggle-roteiros";
  toggleBtn.textContent = `${isExpanded ? "▾" : "▸"} Roteiros (${roteirosDoProduto.length})`;
  toggleBtn.addEventListener("click", () => toggleRoteirosPanel(produto.id));
  card.appendChild(toggleBtn);

  if (isExpanded) {
    card.classList.add("expanded");
    card.appendChild(renderRoteirosPanel(produto));
  }

  return card;
}

function toggleRoteirosPanel(produtoId) {
  if (expandedProductIds.has(produtoId)) {
    expandedProductIds.delete(produtoId);
  } else {
    expandedProductIds.add(produtoId);
  }
  renderProdutos();
}

function renderRoteirosPanel(produto) {
  const panel = document.createElement("div");
  panel.className = "roteiros-panel";

  panel.appendChild(renderRoteiroForm(produto));

  const roteirosDoProduto = roteiros
    .filter((r) => r.produtoId === produto.id)
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  if (roteirosDoProduto.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum roteiro cadastrado para este produto ainda.";
    panel.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "roteiro-list";
    roteirosDoProduto.forEach((roteiro) => list.appendChild(renderRoteiroCard(roteiro)));
    panel.appendChild(list);
  }

  return panel;
}

function renderRoteiroForm(produto) {
  const editingRoteiro = editingRoteiroId ? roteiros.find((r) => r.id === editingRoteiroId) : null;
  const isEditingThis = Boolean(editingRoteiro && editingRoteiro.produtoId === produto.id);

  const form = document.createElement("form");
  form.className = "roteiro-form";
  form.dataset.produtoId = produto.id;

  const title = document.createElement("h4");
  title.textContent = isEditingThis ? "Editar roteiro" : "Novo roteiro";
  form.appendChild(title);

  const anguloInput = document.createElement("input");
  anguloInput.type = "text";
  anguloInput.id = `angulo-${produto.id}`;
  anguloInput.placeholder = "Ex: humor, prova social, urgência";
  anguloInput.value = isEditingThis ? editingRoteiro.anguloOuHook : "";

  const anguloError = document.createElement("span");
  anguloError.className = "error";

  const anguloField = document.createElement("div");
  anguloField.className = "field";
  const anguloLabel = document.createElement("label");
  anguloLabel.textContent = "Ângulo / hook *";
  anguloLabel.htmlFor = anguloInput.id;
  anguloField.append(anguloLabel, anguloInput, anguloError);

  const modoSelect = document.createElement("select");
  modoSelect.id = `modo-${produto.id}`;
  MODOS_OUMOMO.forEach((modo) => {
    const option = document.createElement("option");
    option.value = modo;
    option.textContent = modo;
    modoSelect.appendChild(option);
  });
  modoSelect.value = isEditingThis ? editingRoteiro.modoOumomo : "Não definido";

  const modoField = document.createElement("div");
  modoField.className = "field";
  const modoLabel = document.createElement("label");
  modoLabel.textContent = "Modo Oumomo";
  modoLabel.htmlFor = modoSelect.id;
  modoField.append(modoLabel, modoSelect);

  const textoCompletoArea = document.createElement("textarea");
  textoCompletoArea.id = `texto-completo-${produto.id}`;
  textoCompletoArea.rows = 6;
  textoCompletoArea.placeholder = "Gancho, argumentos de venda, falas de voiceover, lista de planos...";
  textoCompletoArea.value = isEditingThis ? editingRoteiro.textoCompleto : "";

  const textoCompletoError = document.createElement("span");
  textoCompletoError.className = "error";

  const textoCompletoField = document.createElement("div");
  textoCompletoField.className = "field field-full";
  const textoCompletoLabel = document.createElement("label");
  textoCompletoLabel.textContent = "Roteiro completo *";
  textoCompletoLabel.htmlFor = textoCompletoArea.id;
  textoCompletoField.append(textoCompletoLabel, textoCompletoArea, textoCompletoError);

  const textoCondensadoArea = document.createElement("textarea");
  textoCondensadoArea.id = `texto-condensado-${produto.id}`;
  textoCondensadoArea.rows = 3;
  textoCondensadoArea.placeholder = "Versão curta para o campo de prompt do Viral Remake (opcional)";
  textoCondensadoArea.value = isEditingThis ? editingRoteiro.textoCondensado || "" : "";

  const textoCondensadoField = document.createElement("div");
  textoCondensadoField.className = "field field-full";
  const textoCondensadoLabel = document.createElement("label");
  textoCondensadoLabel.textContent = "Roteiro condensado";
  textoCondensadoLabel.htmlFor = textoCondensadoArea.id;
  textoCondensadoField.append(textoCondensadoLabel, textoCondensadoArea);

  const notasArea = document.createElement("textarea");
  notasArea.id = `roteiro-notas-${produto.id}`;
  notasArea.rows = 2;
  notasArea.placeholder = "Notas livres sobre este roteiro (opcional)";
  notasArea.value = isEditingThis ? editingRoteiro.notas || "" : "";

  const notasField = document.createElement("div");
  notasField.className = "field field-full";
  const notasLabel = document.createElement("label");
  notasLabel.textContent = "Notas";
  notasLabel.htmlFor = notasArea.id;
  notasField.append(notasLabel, notasArea);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = isEditingThis ? "Salvar alterações" : "Adicionar roteiro";
  actions.appendChild(submitBtn);

  if (isEditingThis) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "secondary";
    cancelBtn.textContent = "Cancelar edição";
    cancelBtn.addEventListener("click", () => {
      editingRoteiroId = null;
      renderProdutos();
    });
    actions.appendChild(cancelBtn);
  }

  form.append(anguloField, modoField, textoCompletoField, textoCondensadoField, notasField, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    anguloError.textContent = "";
    textoCompletoError.textContent = "";
    anguloInput.classList.remove("invalid");
    textoCompletoArea.classList.remove("invalid");

    let valid = true;

    if (!anguloInput.value.trim()) {
      anguloError.textContent = "Ângulo/hook é obrigatório.";
      anguloInput.classList.add("invalid");
      valid = false;
    }

    if (!textoCompletoArea.value.trim()) {
      textoCompletoError.textContent = "Roteiro completo é obrigatório.";
      textoCompletoArea.classList.add("invalid");
      valid = false;
    }

    if (!valid) return;

    const dadosRoteiro = {
      produtoId: produto.id,
      anguloOuHook: anguloInput.value.trim(),
      textoCompleto: textoCompletoArea.value.trim(),
      textoCondensado: textoCondensadoArea.value.trim(),
      modoOumomo: modoSelect.value,
      notas: notasArea.value.trim(),
    };

    if (isEditingThis) {
      const index = roteiros.findIndex((r) => r.id === editingRoteiro.id);
      if (index !== -1) {
        roteiros[index] = { ...roteiros[index], ...dadosRoteiro };
      }
      editingRoteiroId = null;
    } else {
      roteiros.push({
        id: generateId(),
        ...dadosRoteiro,
        criadoEm: new Date().toISOString(),
      });
    }

    saveRoteiros(roteiros);
    renderAll();
  });

  return form;
}

function renderRoteiroCard(roteiro) {
  const card = document.createElement("div");
  card.className = "roteiro-card";

  const header = document.createElement("div");
  header.className = "roteiro-header";

  const angulo = document.createElement("h5");
  angulo.textContent = roteiro.anguloOuHook;
  header.appendChild(angulo);

  const modoBadge = document.createElement("span");
  modoBadge.className = "modo-badge";
  modoBadge.textContent = roteiro.modoOumomo || "Não definido";
  header.appendChild(modoBadge);

  card.appendChild(header);

  card.appendChild(renderTextoBlock("Roteiro completo", roteiro.textoCompleto));

  if (roteiro.textoCondensado) {
    card.appendChild(renderTextoBlock("Roteiro condensado", roteiro.textoCondensado));
  }

  if (roteiro.notas) {
    const notasEl = document.createElement("div");
    notasEl.className = "obs";
    notasEl.textContent = `Notas: ${roteiro.notas}`;
    card.appendChild(notasEl);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit";
  editBtn.textContent = "Editar";
  editBtn.addEventListener("click", () => {
    editingRoteiroId = roteiro.id;
    expandedProductIds.add(roteiro.produtoId);
    renderProdutos();
    const formEl = document.querySelector(`.roteiro-form[data-produto-id="${roteiro.produtoId}"]`);
    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.textContent = "Excluir";
  deleteBtn.addEventListener("click", () => deleteRoteiro(roteiro.id));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);

  const resultadosDoRoteiro = resultados.filter((r) => r.roteiroId === roteiro.id);
  const isResultadosExpanded = expandedRoteiroIds.has(roteiro.id);

  const resultadosToggleBtn = document.createElement("button");
  resultadosToggleBtn.type = "button";
  resultadosToggleBtn.className = "btn-toggle-roteiros";
  resultadosToggleBtn.textContent = `${isResultadosExpanded ? "▾" : "▸"} Resultados (${resultadosDoRoteiro.length})`;
  resultadosToggleBtn.addEventListener("click", () => toggleResultadosPanel(roteiro.id));
  card.appendChild(resultadosToggleBtn);

  if (isResultadosExpanded) {
    card.appendChild(renderResultadosPanel(roteiro));
  }

  return card;
}

function toggleResultadosPanel(roteiroId) {
  if (expandedRoteiroIds.has(roteiroId)) {
    expandedRoteiroIds.delete(roteiroId);
  } else {
    expandedRoteiroIds.add(roteiroId);
  }
  renderProdutos();
}

function renderResultadosPanel(roteiro) {
  const panel = document.createElement("div");
  panel.className = "resultados-panel";

  panel.appendChild(renderResultadoForm(roteiro));

  const resultadosDoRoteiro = resultados
    .filter((r) => r.roteiroId === roteiro.id)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  if (resultadosDoRoteiro.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum resultado registrado para este roteiro ainda.";
    panel.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "resultado-list";
    resultadosDoRoteiro.forEach((resultado) => list.appendChild(renderResultadoCard(resultado)));
    panel.appendChild(list);
  }

  return panel;
}

function renderResultadoForm(roteiro) {
  const editingResultado = editingResultadoId ? resultados.find((r) => r.id === editingResultadoId) : null;
  const isEditingThis = Boolean(editingResultado && editingResultado.roteiroId === roteiro.id);

  const form = document.createElement("form");
  form.className = "resultado-form";
  form.dataset.roteiroId = roteiro.id;

  const title = document.createElement("h4");
  title.textContent = isEditingThis ? "Editar resultado" : "Novo resultado";
  form.appendChild(title);

  const dataInput = document.createElement("input");
  dataInput.type = "date";
  dataInput.id = `resultado-data-${roteiro.id}`;
  dataInput.value = isEditingThis ? editingResultado.data : new Date().toISOString().slice(0, 10);

  const dataError = document.createElement("span");
  dataError.className = "error";

  const dataField = document.createElement("div");
  dataField.className = "field";
  const dataLabel = document.createElement("label");
  dataLabel.textContent = "Data *";
  dataLabel.htmlFor = dataInput.id;
  dataField.append(dataLabel, dataInput, dataError);

  const viewsInput = document.createElement("input");
  viewsInput.type = "number";
  viewsInput.id = `resultado-views-${roteiro.id}`;
  viewsInput.min = "0";
  viewsInput.step = "1";
  viewsInput.placeholder = "Ex: 15000";
  viewsInput.value = isEditingThis ? editingResultado.views : "";

  const viewsError = document.createElement("span");
  viewsError.className = "error";

  const viewsField = document.createElement("div");
  viewsField.className = "field";
  const viewsLabel = document.createElement("label");
  viewsLabel.textContent = "Views *";
  viewsLabel.htmlFor = viewsInput.id;
  viewsField.append(viewsLabel, viewsInput, viewsError);

  const vendasInput = document.createElement("input");
  vendasInput.type = "number";
  vendasInput.id = `resultado-vendas-${roteiro.id}`;
  vendasInput.min = "0";
  vendasInput.step = "1";
  vendasInput.placeholder = "Ex: 12";
  vendasInput.value = isEditingThis ? editingResultado.vendas ?? "" : "";

  const vendasField = document.createElement("div");
  vendasField.className = "field";
  const vendasLabel = document.createElement("label");
  vendasLabel.textContent = "Vendas";
  vendasLabel.htmlFor = vendasInput.id;
  vendasField.append(vendasLabel, vendasInput);

  const comissaoInput = document.createElement("input");
  comissaoInput.type = "number";
  comissaoInput.id = `resultado-comissao-${roteiro.id}`;
  comissaoInput.min = "0";
  comissaoInput.step = "0.01";
  comissaoInput.placeholder = "Ex: 45.00";
  comissaoInput.value = isEditingThis ? editingResultado.comissaoValor ?? "" : "";

  const comissaoField = document.createElement("div");
  comissaoField.className = "field";
  const comissaoLabel = document.createElement("label");
  comissaoLabel.textContent = "Comissão (R$)";
  comissaoLabel.htmlFor = comissaoInput.id;
  comissaoField.append(comissaoLabel, comissaoInput);

  const ctrInput = document.createElement("input");
  ctrInput.type = "number";
  ctrInput.id = `resultado-ctr-${roteiro.id}`;
  ctrInput.min = "0";
  ctrInput.max = "100";
  ctrInput.step = "0.01";
  ctrInput.placeholder = "Ex: 3.2";
  ctrInput.value = isEditingThis ? editingResultado.ctr ?? "" : "";

  const ctrField = document.createElement("div");
  ctrField.className = "field";
  const ctrLabel = document.createElement("label");
  ctrLabel.textContent = "CTR (%)";
  ctrLabel.htmlFor = ctrInput.id;
  ctrField.append(ctrLabel, ctrInput);

  const obsArea = document.createElement("textarea");
  obsArea.id = `resultado-obs-${roteiro.id}`;
  obsArea.rows = 2;
  obsArea.placeholder = "Notas livres sobre este resultado (opcional)";
  obsArea.value = isEditingThis ? editingResultado.observacoes || "" : "";

  const obsField = document.createElement("div");
  obsField.className = "field field-full";
  const obsLabel = document.createElement("label");
  obsLabel.textContent = "Observações";
  obsLabel.htmlFor = obsArea.id;
  obsField.append(obsLabel, obsArea);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = isEditingThis ? "Salvar alterações" : "Adicionar resultado";
  actions.appendChild(submitBtn);

  if (isEditingThis) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "secondary";
    cancelBtn.textContent = "Cancelar edição";
    cancelBtn.addEventListener("click", () => {
      editingResultadoId = null;
      renderProdutos();
    });
    actions.appendChild(cancelBtn);
  }

  form.append(dataField, viewsField, vendasField, comissaoField, ctrField, obsField, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    dataError.textContent = "";
    viewsError.textContent = "";
    dataInput.classList.remove("invalid");
    viewsInput.classList.remove("invalid");

    let valid = true;

    if (!dataInput.value) {
      dataError.textContent = "Data é obrigatória.";
      dataInput.classList.add("invalid");
      valid = false;
    }

    if (viewsInput.value === "") {
      viewsError.textContent = "Views é obrigatório.";
      viewsInput.classList.add("invalid");
      valid = false;
    }

    if (!valid) return;

    const dadosResultado = {
      roteiroId: roteiro.id,
      data: dataInput.value,
      views: Number(viewsInput.value),
      vendas: vendasInput.value === "" ? "" : Number(vendasInput.value),
      comissaoValor: comissaoInput.value === "" ? "" : Number(comissaoInput.value),
      ctr: ctrInput.value === "" ? "" : Number(ctrInput.value),
      observacoes: obsArea.value.trim(),
    };

    if (isEditingThis) {
      const index = resultados.findIndex((r) => r.id === editingResultado.id);
      if (index !== -1) {
        resultados[index] = { ...resultados[index], ...dadosResultado };
      }
      editingResultadoId = null;
    } else {
      resultados.push({
        id: generateId(),
        ...dadosResultado,
        criadoEm: new Date().toISOString(),
      });
    }

    saveResultados(resultados);
    renderAll();
  });

  return form;
}

function renderResultadoCard(resultado) {
  const card = document.createElement("div");
  card.className = "resultado-card";

  const header = document.createElement("div");
  header.className = "resultado-header";

  const dataEl = document.createElement("h5");
  dataEl.textContent = formatarDataBR(resultado.data);
  header.appendChild(dataEl);

  const viewsBadge = document.createElement("span");
  viewsBadge.className = "modo-badge";
  viewsBadge.textContent = `${resultado.views} views`;
  header.appendChild(viewsBadge);

  card.appendChild(header);

  const metaParts = [];
  if (resultado.vendas !== "" && resultado.vendas !== undefined && resultado.vendas !== null) {
    metaParts.push(`Vendas: ${resultado.vendas}`);
  }
  if (resultado.comissaoValor !== "" && resultado.comissaoValor !== undefined && resultado.comissaoValor !== null) {
    metaParts.push(`Comissão: R$ ${Number(resultado.comissaoValor).toFixed(2)}`);
  }
  if (resultado.ctr !== "" && resultado.ctr !== undefined && resultado.ctr !== null) {
    metaParts.push(`CTR: ${Number(resultado.ctr)}%`);
  }
  if (metaParts.length > 0) {
    const metaEl = document.createElement("div");
    metaEl.className = "meta";
    metaEl.textContent = metaParts.join(" · ");
    card.appendChild(metaEl);
  }

  if (resultado.observacoes) {
    const obsEl = document.createElement("div");
    obsEl.className = "obs";
    obsEl.textContent = resultado.observacoes;
    card.appendChild(obsEl);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit";
  editBtn.textContent = "Editar";
  editBtn.addEventListener("click", () => {
    editingResultadoId = resultado.id;
    expandedRoteiroIds.add(resultado.roteiroId);
    const roteiroPai = roteiros.find((r) => r.id === resultado.roteiroId);
    if (roteiroPai) expandedProductIds.add(roteiroPai.produtoId);
    renderProdutos();
    const formEl = document.querySelector(`.resultado-form[data-roteiro-id="${resultado.roteiroId}"]`);
    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete";
  deleteBtn.textContent = "Excluir";
  deleteBtn.addEventListener("click", () => deleteResultado(resultado.id));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);

  return card;
}

function deleteResultado(id) {
  const resultado = resultados.find((r) => r.id === id);
  if (!resultado) return;

  const confirmado = window.confirm(`Excluir este resultado (${formatarDataBR(resultado.data)})? Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  resultados = resultados.filter((r) => r.id !== id);
  saveResultados(resultados);

  if (editingResultadoId === id) {
    editingResultadoId = null;
  }

  renderAll();
}

function getLinhasComparativo() {
  return resultados.map((resultado) => {
    const roteiro = roteiros.find((r) => r.id === resultado.roteiroId);
    const produto = roteiro ? produtos.find((p) => p.id === roteiro.produtoId) : null;

    return {
      resultadoId: resultado.id,
      produtoNome: produto ? produto.nome : "—",
      anguloOuHook: roteiro ? roteiro.anguloOuHook : "—",
      modoOumomo: roteiro ? roteiro.modoOumomo : "—",
      data: resultado.data,
      views: Number(resultado.views) || 0,
      vendas: resultado.vendas === "" || resultado.vendas === undefined || resultado.vendas === null ? null : Number(resultado.vendas),
      comissaoValor: resultado.comissaoValor === "" || resultado.comissaoValor === undefined || resultado.comissaoValor === null ? null : Number(resultado.comissaoValor),
      ctr: resultado.ctr === "" || resultado.ctr === undefined || resultado.ctr === null ? null : Number(resultado.ctr),
    };
  });
}

function compararLinhas(a, b, coluna, tipo) {
  const valA = a[coluna];
  const valB = b[coluna];

  if (tipo === "numero") {
    const numA = valA === null || valA === undefined ? 0 : valA;
    const numB = valB === null || valB === undefined ? 0 : valB;
    return numA - numB;
  }

  if (tipo === "data") {
    return new Date(valA || 0) - new Date(valB || 0);
  }

  return String(valA || "").localeCompare(String(valB || ""), "pt-BR");
}

function formatarValorComparativo(linha, coluna) {
  const valor = linha[coluna.key];

  if (coluna.key === "data") return formatarDataBR(valor);

  if (coluna.tipo === "numero") {
    if (valor === null || valor === undefined) return "—";
    if (coluna.key === "comissaoValor") return `R$ ${Number(valor).toFixed(2)}`;
    if (coluna.key === "ctr") return `${Number(valor)}%`;
    return String(valor);
  }

  return valor;
}

function renderComparativo() {
  const total = resultados.length;
  comparativoToggleBtn.textContent = `${comparativoExpanded ? "▾" : "▸"} Comparativo de resultados (${total})`;
  comparativoContainer.hidden = !comparativoExpanded;
  comparativoContainer.innerHTML = "";

  if (!comparativoExpanded) return;

  const linhas = getLinhasComparativo();

  if (linhas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum resultado registrado ainda.";
    comparativoContainer.appendChild(empty);
    return;
  }

  const colunaAtiva = COMPARATIVO_COLUNAS.find((c) => c.key === comparativoSort.coluna);
  const linhasOrdenadas = linhas.slice().sort((a, b) => {
    const resultadoComparacao = compararLinhas(a, b, colunaAtiva.key, colunaAtiva.tipo);
    return comparativoSort.direcao === "asc" ? resultadoComparacao : -resultadoComparacao;
  });

  const table = document.createElement("table");
  table.className = "comparativo-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  COMPARATIVO_COLUNAS.forEach((coluna) => {
    const th = document.createElement("th");
    const isActive = comparativoSort.coluna === coluna.key;
    const arrow = isActive ? (comparativoSort.direcao === "asc" ? " ▲" : " ▼") : "";
    th.textContent = coluna.label + arrow;
    th.addEventListener("click", () => {
      if (comparativoSort.coluna === coluna.key) {
        comparativoSort = { coluna: coluna.key, direcao: comparativoSort.direcao === "asc" ? "desc" : "asc" };
      } else {
        comparativoSort = { coluna: coluna.key, direcao: "asc" };
      }
      renderComparativo();
    });
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  linhasOrdenadas.forEach((linha) => {
    const tr = document.createElement("tr");
    COMPARATIVO_COLUNAS.forEach((coluna) => {
      const td = document.createElement("td");
      td.textContent = formatarValorComparativo(linha, coluna);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  comparativoContainer.appendChild(table);
}

function renderTextoBlock(label, texto) {
  const wrapper = document.createElement("div");
  wrapper.className = "texto-block";

  const headerRow = document.createElement("div");
  headerRow.className = "texto-block-header";

  const labelEl = document.createElement("span");
  labelEl.className = "texto-block-label";
  labelEl.textContent = label;
  headerRow.appendChild(labelEl);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn-copy";
  copyBtn.textContent = "Copiar";
  copyBtn.addEventListener("click", () => copiarTexto(texto, copyBtn));
  headerRow.appendChild(copyBtn);

  wrapper.appendChild(headerRow);

  const textoEl = document.createElement("pre");
  textoEl.className = "texto-block-content";
  textoEl.textContent = texto;
  wrapper.appendChild(textoEl);

  return wrapper;
}

function copiarTexto(texto, button) {
  const originalLabel = button.textContent;

  function showCopiado() {
    button.textContent = "Copiado!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("copied");
    }, 1500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(showCopiado).catch((e) => {
      console.error("Falha ao copiar para a área de transferência:", e);
    });
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showCopiado();
  } catch (e) {
    console.error("Falha ao copiar para a área de transferência:", e);
  }
  document.body.removeChild(textarea);
}

function deleteRoteiro(id) {
  const roteiro = roteiros.find((r) => r.id === id);
  if (!roteiro) return;

  const resultadosDoRoteiro = resultados.filter((r) => r.roteiroId === id);
  const avisoResultados = resultadosDoRoteiro.length > 0
    ? ` Isso também excluirá ${resultadosDoRoteiro.length} resultado(s) vinculado(s) a ele.`
    : "";

  const confirmado = window.confirm(`Excluir o roteiro "${roteiro.anguloOuHook}"?${avisoResultados} Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  roteiros = roteiros.filter((r) => r.id !== id);
  resultados = resultados.filter((r) => r.roteiroId !== id);
  saveRoteiros(roteiros);
  saveResultados(resultados);

  if (editingRoteiroId === id) {
    editingRoteiroId = null;
  }
  expandedRoteiroIds.delete(id);
  if (editingResultadoId && resultadosDoRoteiro.some((r) => r.id === editingResultadoId)) {
    editingResultadoId = null;
  }

  renderAll();
}

function clearFieldErrors() {
  erroNome.textContent = "";
  erroCategoria.textContent = "";
  nomeInput.classList.remove("invalid");
  categoriaInput.classList.remove("invalid");
}

function validateForm() {
  clearFieldErrors();
  let valid = true;

  if (!nomeInput.value.trim()) {
    erroNome.textContent = "Nome é obrigatório.";
    nomeInput.classList.add("invalid");
    valid = false;
  }

  if (!categoriaInput.value.trim()) {
    erroCategoria.textContent = "Categoria é obrigatória.";
    categoriaInput.classList.add("invalid");
    valid = false;
  }

  return valid;
}

function resetForm() {
  form.reset();
  productIdInput.value = "";
  clearFieldErrors();
  formTitle.textContent = "Novo produto";
  submitBtn.textContent = "Adicionar produto";
  cancelEditBtn.hidden = true;
}

function startEdit(id) {
  const produto = produtos.find((p) => p.id === id);
  if (!produto) return;

  productIdInput.value = produto.id;
  nomeInput.value = produto.nome;
  categoriaInput.value = produto.categoria;
  linkInput.value = produto.link || "";
  comissaoInput.value = produto.comissaoPercent ?? "";
  precoInput.value = produto.preco ?? "";
  observacoesInput.value = produto.observacoes || "";

  clearFieldErrors();
  formTitle.textContent = "Editar produto";
  submitBtn.textContent = "Salvar alterações";
  cancelEditBtn.hidden = false;

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteProduto(id) {
  const produto = produtos.find((p) => p.id === id);
  if (!produto) return;

  const roteirosDoProduto = roteiros.filter((r) => r.produtoId === id);
  const roteiroIdsDoProduto = new Set(roteirosDoProduto.map((r) => r.id));
  const resultadosDoProduto = resultados.filter((r) => roteiroIdsDoProduto.has(r.roteiroId));

  const partesAviso = [];
  if (roteirosDoProduto.length > 0) partesAviso.push(`${roteirosDoProduto.length} roteiro(s)`);
  if (resultadosDoProduto.length > 0) partesAviso.push(`${resultadosDoProduto.length} resultado(s)`);
  const avisoRoteiros = partesAviso.length > 0
    ? ` Isso também excluirá ${partesAviso.join(" e ")} vinculado(s) a ele.`
    : "";

  const confirmado = window.confirm(`Excluir o produto "${produto.nome}"?${avisoRoteiros} Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  produtos = produtos.filter((p) => p.id !== id);
  roteiros = roteiros.filter((r) => r.produtoId !== id);
  resultados = resultados.filter((r) => !roteiroIdsDoProduto.has(r.roteiroId));
  saveProdutos(produtos);
  saveRoteiros(roteiros);
  saveResultados(resultados);
  expandedProductIds.delete(id);
  roteiroIdsDoProduto.forEach((roteiroId) => expandedRoteiroIds.delete(roteiroId));
  if (editingRoteiroId && roteiroIdsDoProduto.has(editingRoteiroId)) {
    editingRoteiroId = null;
  }
  if (editingResultadoId && resultadosDoProduto.some((r) => r.id === editingResultadoId)) {
    editingResultadoId = null;
  }
  renderAll();

  if (productIdInput.value === id) {
    resetForm();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) return;

  const editingId = productIdInput.value;

  const dadosProduto = {
    nome: nomeInput.value.trim(),
    categoria: categoriaInput.value.trim(),
    link: linkInput.value.trim(),
    comissaoPercent: comissaoInput.value === "" ? "" : Number(comissaoInput.value),
    preco: precoInput.value === "" ? "" : Number(precoInput.value),
    observacoes: observacoesInput.value.trim(),
  };

  if (editingId) {
    const index = produtos.findIndex((p) => p.id === editingId);
    if (index !== -1) {
      produtos[index] = { ...produtos[index], ...dadosProduto };
    }
  } else {
    produtos.push({
      id: generateId(),
      ...dadosProduto,
      criadoEm: new Date().toISOString(),
    });
  }

  saveProdutos(produtos);
  renderAll();
  resetForm();
});

cancelEditBtn.addEventListener("click", resetForm);

comparativoToggleBtn.addEventListener("click", () => {
  comparativoExpanded = !comparativoExpanded;
  renderComparativo();
});

renderAll();
