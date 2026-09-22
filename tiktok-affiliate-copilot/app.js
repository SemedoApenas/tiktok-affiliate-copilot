const STORAGE_KEY = "tiktok-affiliate-copilot:produtos";

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

function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let produtos = loadProdutos();

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

  return card;
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

  const confirmado = window.confirm(`Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  produtos = produtos.filter((p) => p.id !== id);
  saveProdutos(produtos);
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
