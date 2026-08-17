const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

let listaImpressoras = []
let listaLeituras = []

// Estado da paginação: a lista filtrada completa fica aqui, e só a
// "fatia" da página atual vai pra tabela. Os cards de resumo continuam
// olhando pra lista filtrada inteira, não só pra página visível.
let leiturasFiltradasAtual = []
let paginaAtual = 1
let itensPorPagina = 20

// =============================================
// CARREGAR DADOS
// =============================================
async function carregarDados() {
  const { data: impressoras, error: erroImp } = await db
    .from("impressoras")
    .select("*")

  const { data: leituras, error: erroLeit } = await db
    .from("paginasImpressas")
    .select("*")
    .order("data", { ascending: false })
    .order("sequenciaDia", { ascending: false })

  if (erroImp || erroLeit) {
    if (erroImp) console.error("[paginasImpressas] Erro ao carregar impressoras:", erroImp.message || erroImp)
    if (erroLeit) console.error("[paginasImpressas] Erro ao carregar leituras:", erroLeit.message || erroLeit)
    return
  }

  listaImpressoras = impressoras || []
  listaLeituras = leituras || []

  popularFiltroImpressora()
  popularFiltroSetor()
  popularSelectImpressoraModal()
  aplicarFiltros()
}

// =============================================
// HELPERS
// =============================================
function buscarImpressora(id) {
  return listaImpressoras.find(i => i.id === id)
}

function ultimaLeituraDaImpressora(impressoraId) {
  const leituras = listaLeituras
    .filter(l => l.impressoraId === impressoraId)
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? 1 : -1
      return b.sequenciaDia - a.sequenciaDia
    })

  return leituras[0] || null
}

function classeToner(valor) {
  if (valor === null || valor === undefined) return ""
  if (valor <= 15) return "toner-baixo"
  if (valor <= 50) return "toner-medio"
  return "toner-alto"
}

function formatarData(dataISO) {
  if (!dataISO) return "—"
  const [ano, mes, dia] = dataISO.split("-")
  return `${dia}/${mes}/${ano}`
}

// =============================================
// POPULAR FILTROS
// =============================================
function popularFiltroImpressora() {
  const select = document.getElementById("filtro-impressora")
  select.innerHTML = '<option value="">Todas as impressoras</option>'

  listaImpressoras
    .slice()
    .sort((a, b) => (a.modelo || "").localeCompare(b.modelo || ""))
    .forEach(imp => {
      const option = document.createElement("option")
      option.value = imp.id
      option.textContent = `${imp.modelo} — ${imp.setor}`
      select.appendChild(option)
    })
}

function popularFiltroSetor() {
  const select = document.getElementById("filtro-setor")
  select.innerHTML = '<option value="">Todos os setores</option>'

  const setoresUnicos = [...new Set(listaImpressoras.map(i => i.setor))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  setoresUnicos.forEach(setor => {
    const option = document.createElement("option")
    option.value = setor
    option.textContent = setor
    select.appendChild(option)
  })
}

function popularSelectImpressoraModal() {
  const select = document.getElementById("leitura-impressora")
  select.innerHTML = '<option value="">Selecione...</option>'

  listaImpressoras
    .slice()
    .sort((a, b) => (a.modelo || "").localeCompare(b.modelo || ""))
    .forEach(imp => {
      const option = document.createElement("option")
      option.value = imp.id
      option.textContent = `${imp.modelo} — ${imp.setor}`
      select.appendChild(option)
    })
}

// =============================================
// PAINEL DE FILTROS (abrir/fechar com animação)
// =============================================
function alternarPainelFiltros() {
  const painel = document.getElementById("painel-filtros")
  const botao = document.getElementById("btn-toggle-filtros")

  const aberto = painel.classList.toggle("aberto")
  botao.setAttribute("aria-expanded", String(aberto))
}

// =============================================
// FILTROS DA TABELA
// =============================================
function aplicarFiltros() {
  const impressoraId = document.getElementById("filtro-impressora").value
  const setor = document.getElementById("filtro-setor").value
  const dataInicio = document.getElementById("filtro-data-inicio").value
  const dataFim = document.getElementById("filtro-data-fim").value

  let filtrado = listaLeituras.slice()

  if (impressoraId) {
    filtrado = filtrado.filter(l => String(l.impressoraId) === String(impressoraId))
  }

  if (setor) {
    filtrado = filtrado.filter(l => {
      const imp = buscarImpressora(l.impressoraId)
      return imp && imp.setor === setor
    })
  }

  if (dataInicio) {
    filtrado = filtrado.filter(l => l.data >= dataInicio)
  }

  if (dataFim) {
    filtrado = filtrado.filter(l => l.data <= dataFim)
  }

  leiturasFiltradasAtual = filtrado
  paginaAtual = 1 // toda vez que o filtro muda, volta pra primeira página

  atualizarCards(filtrado)
  renderizarPaginaAtual()
}

// =============================================
// PAGINAÇÃO
// =============================================
function renderizarPaginaAtual() {
  const totalItens = leiturasFiltradasAtual.length
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina))

  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas
  if (paginaAtual < 1) paginaAtual = 1

  const inicio = (paginaAtual - 1) * itensPorPagina
  const fim = inicio + itensPorPagina
  const paginaDeItens = leiturasFiltradasAtual.slice(inicio, fim)

  renderizarTabela(paginaDeItens)
  renderizarControlesPaginacao(totalItens, totalPaginas, inicio, fim)
}

function renderizarControlesPaginacao(totalItens, totalPaginas, inicio, fim) {
  const info = document.getElementById("paginacao-info")
  const atual = document.getElementById("paginacao-atual")
  const btnAnterior = document.getElementById("btn-pagina-anterior")
  const btnProxima = document.getElementById("btn-pagina-proxima")

  if (totalItens === 0) {
    info.textContent = "Nenhuma leitura encontrada"
  } else {
    const primeiro = inicio + 1
    const ultimo = Math.min(fim, totalItens)
    info.textContent = `Mostrando ${primeiro}–${ultimo} de ${totalItens} leituras`
  }

  atual.textContent = `Página ${paginaAtual} de ${totalPaginas}`
  btnAnterior.disabled = paginaAtual <= 1
  btnProxima.disabled = paginaAtual >= totalPaginas
}

function irParaPaginaAnterior() {
  if (paginaAtual <= 1) return
  paginaAtual -= 1
  renderizarPaginaAtual()
}

function irParaProximaPagina() {
  const totalPaginas = Math.max(1, Math.ceil(leiturasFiltradasAtual.length / itensPorPagina))
  if (paginaAtual >= totalPaginas) return
  paginaAtual += 1
  renderizarPaginaAtual()
}

function aoMudarItensPorPagina() {
  itensPorPagina = parseInt(document.getElementById("filtro-itens-pagina").value) || 20
  paginaAtual = 1
  renderizarPaginaAtual()
}

// =============================================
// RENDERIZAR TABELA
// =============================================
function renderizarTabela(leituras) {
  const corpo = document.getElementById("corpo-leituras")
  corpo.innerHTML = ""

  if (leituras.length === 0) {
    corpo.innerHTML = '<tr><td colspan="9" class="sem-dados">Nenhuma leitura encontrada</td></tr>'
    return
  }

  leituras.forEach(l => {
    const imp = buscarImpressora(l.impressoraId)
    const tonerClasse = classeToner(l.statusToner)

    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${formatarData(l.data)}</td>
      <td>#${l.sequenciaDia}</td>
      <td>${imp ? imp.modelo : "—"}</td>
      <td>${imp ? imp.setor : "—"}</td>
      <td>${l.contadorAnterior}</td>
      <td>${l.contadorAtual}</td>
      <td class="diferenca">${l.diferenca}</td>
      <td>${l.statusToner !== null ? `<span class="toner-pill ${tonerClasse}">${l.statusToner}%</span>` : "—"}</td>
      <td>${l.trocaToner ? `<span class="troca-pill">✓ ${new Date(l.trocaToner).toLocaleString("pt-BR")}</span>` : '<span class="sem-troca">—</span>'}</td>
    `
    corpo.appendChild(tr)
  })
}

// =============================================
// CARDS DE RESUMO
// =============================================
function atualizarCards(leiturasFiltradas) {
  document.getElementById("totalLeituras").textContent = leiturasFiltradas.length

  const totalPaginas = leiturasFiltradas.reduce((t, l) => t + (Number(l.diferenca) || 0), 0)
  document.getElementById("totalPaginas").textContent = totalPaginas.toLocaleString("pt-BR")

  const tonerBaixo = leiturasFiltradas.filter(l => l.statusToner !== null && l.statusToner <= 15).length
  document.getElementById("totalTonerBaixo").textContent = tonerBaixo

  const consumoPorImpressora = {}
  leiturasFiltradas.forEach(l => {
    consumoPorImpressora[l.impressoraId] = (consumoPorImpressora[l.impressoraId] || 0) + (Number(l.diferenca) || 0)
  })

  const ranking = Object.entries(consumoPorImpressora).sort((a, b) => b[1] - a[1])

  if (ranking.length === 0) {
    document.getElementById("topConsumo").textContent = "—"
  } else {
    const [impressoraId, total] = ranking[0]
    const imp = buscarImpressora(impressoraId) || buscarImpressora(Number(impressoraId))
    document.getElementById("topConsumo").textContent =
      imp ? `${imp.modelo} (${total.toLocaleString("pt-BR")} páginas)` : `${total.toLocaleString("pt-BR")} páginas`
  }
}

// =============================================
// MODAL DE NOVA LEITURA
// =============================================
function abrirModalLeitura() {
  document.getElementById("form-leitura").reset()
  document.getElementById("leitura-data").value = new Date().toISOString().split("T")[0]
  document.getElementById("leitura-sequencia").value = 1
  document.getElementById("leitura-contador-anterior").value = ""
  document.getElementById("modal-leitura").classList.add("active")
}

function fecharModalLeitura() {
  document.getElementById("modal-leitura").classList.remove("active")
}

function aoSelecionarImpressoraNoModal() {
  const impressoraId = document.getElementById("leitura-impressora").value
  if (!impressoraId) return

  const ultima = ultimaLeituraDaImpressora(impressoraId)
  document.getElementById("leitura-contador-anterior").value = ultima ? ultima.contadorAtual : 0

  const hoje = new Date().toISOString().split("T")[0]
  const leiturasHoje = listaLeituras.filter(l => String(l.impressoraId) === String(impressoraId) && l.data === hoje)
  document.getElementById("leitura-sequencia").value = leiturasHoje.length + 1
}

async function salvarLeitura(e) {
  e.preventDefault()

  const impressoraId = document.getElementById("leitura-impressora").value
  const data = document.getElementById("leitura-data").value
  const sequenciaDia = parseInt(document.getElementById("leitura-sequencia").value)
  const contadorAnterior = parseInt(document.getElementById("leitura-contador-anterior").value)
  const contadorAtual = parseInt(document.getElementById("leitura-contador-atual").value)
  const statusTonerRaw = document.getElementById("leitura-toner").value
  const houveTroca = document.getElementById("leitura-troca").checked
  const observacao = document.getElementById("leitura-observacao").value

  if (contadorAtual < contadorAnterior) {
    alert("O contador atual não pode ser menor que o contador anterior.")
    return
  }

  const { error } = await db
    .from("paginasImpressas")
    .insert({
      impressoraId: impressoraId,
      data: data,
      sequenciaDia: sequenciaDia,
      contadorAnterior: contadorAnterior,
      contadorAtual: contadorAtual,
      statusToner: statusTonerRaw === "" ? null : parseInt(statusTonerRaw),
      trocaToner: houveTroca ? new Date().toISOString() : null,
      observacao: observacao || null
    })

  if (error) {
    alert("Erro ao salvar leitura: " + error.message)
    return
  }

  fecharModalLeitura()
  await carregarDados()
}

// =============================================
// EVENTOS
// =============================================
// Helper: liga o evento só se o elemento existir, e avisa no
// console (em vez de quebrar o script inteiro em silêncio) se não achar.
function on(idOuSeletor, evento, handler, porSeletor = false) {
  const el = porSeletor
    ? document.querySelector(idOuSeletor)
    : document.getElementById(idOuSeletor)

  if (!el) {
    console.warn(`[paginasImpressas] elemento não encontrado: ${idOuSeletor}`)
    return
  }

  el.addEventListener(evento, handler)
}

on("btn-nova-leitura", "click", abrirModalLeitura)
on(".close-btn", "click", fecharModalLeitura, true)
on(".btn-cancelar", "click", fecharModalLeitura, true)
on("form-leitura", "submit", salvarLeitura)
on("leitura-impressora", "change", aoSelecionarImpressoraNoModal)

on("modal-leitura", "click", (e) => {
  if (e.target.id === "modal-leitura") fecharModalLeitura()
})

on("btn-toggle-filtros", "click", alternarPainelFiltros)

on("filtro-impressora", "change", aplicarFiltros)
on("filtro-setor", "change", aplicarFiltros)
on("filtro-data-inicio", "change", aplicarFiltros)
on("filtro-data-fim", "change", aplicarFiltros)

on("btn-pagina-anterior", "click", irParaPaginaAnterior)
on("btn-pagina-proxima", "click", irParaProximaPagina)
on("filtro-itens-pagina", "change", aoMudarItensPorPagina)

on("btn-limpar-filtros", "click", () => {
  document.getElementById("filtro-impressora").value = ""
  document.getElementById("filtro-setor").value = ""
  document.getElementById("filtro-data-inicio").value = ""
  document.getElementById("filtro-data-fim").value = ""
  document.getElementById("filtro-itens-pagina").value = "20"
  itensPorPagina = 20
  aplicarFiltros()
})

// =============================================
// INICIALIZAÇÃO
// =============================================
carregarDados()