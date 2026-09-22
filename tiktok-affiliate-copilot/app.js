const STORAGE_KEY = "tiktok-affiliate-copilot:produtos";
const ROTEIRO_STORAGE_KEY = "tiktok-affiliate-copilot:roteiros";
const MODOS_OUMOMO = ["Não definido", "Link to Video", "Viral Remake"];

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

function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let produtos = loadProdutos();
let roteiros = loadRoteiros();
let expandedProductIds = new Set();
let editingRoteiroId = null;

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
    renderProdutos();
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

  return card;
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

  const confirmado = window.confirm(`Excluir o roteiro "${roteiro.anguloOuHook}"? Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  roteiros = roteiros.filter((r) => r.id !== id);
  saveRoteiros(roteiros);

  if (editingRoteiroId === id) {
    editingRoteiroId = null;
  }

  renderProdutos();
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
  const avisoRoteiros = roteirosDoProduto.length > 0
    ? ` Isso também excluirá ${roteirosDoProduto.length} roteiro(s) vinculado(s) a ele.`
    : "";

  const confirmado = window.confirm(`Excluir o produto "${produto.nome}"?${avisoRoteiros} Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  produtos = produtos.filter((p) => p.id !== id);
  roteiros = roteiros.filter((r) => r.produtoId !== id);
  saveProdutos(produtos);
  saveRoteiros(roteiros);
  expandedProductIds.delete(id);
  if (editingRoteiroId && roteirosDoProduto.some((r) => r.id === editingRoteiroId)) {
    editingRoteiroId = null;
  }
  renderProdutos();

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
  renderProdutos();
  resetForm();
});

cancelEditBtn.addEventListener("click", resetForm);

renderProdutos();
