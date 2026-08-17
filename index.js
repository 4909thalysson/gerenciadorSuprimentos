const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

let listaImpressoras = []
let listaLeituras = []
let impressoraAtual = null

// =============================================
// PERFIL DO USUÁRIO / LOGOUT
// =============================================
async function carregarPerfilUsuario() {
  const { data, error } = await db.auth.getUser()

  if (error || !data.user) {
    document.getElementById("perfil-email").textContent = "Visitante"
    return
  }

  document.getElementById("perfil-email").textContent = data.user.email
}

async function sair() {
  await db.auth.signOut()
  window.location.href = "/login.html"
}

// =============================================
// HELPERS DE LEITURA
// =============================================
// Mesma lógica usada em Páginas Impressas: pega a leitura mais recente
// (por data e depois por sequência do dia) de uma impressora específica.
function ultimaLeituraDaImpressora(impressoraId) {
  const leituras = listaLeituras
    .filter(l => l.impressoraId === impressoraId)
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? 1 : -1
      return b.sequenciaDia - a.sequenciaDia
    })

  return leituras[0] || null
}

// =============================================
// GERENCIAR MODAL
// =============================================
function abrirModalLeitura(impressora) {
  impressoraAtual = impressora

  document.getElementById("impressora-nome").value = impressora.modelo
  document.getElementById("leitura-data").value = new Date().toISOString().split('T')[0]

  const ultima = ultimaLeituraDaImpressora(impressora.id)
  document.getElementById("leitura-contador-anterior").value = ultima ? ultima.contadorAtual : 0
  document.getElementById("leitura-contador-atual").value = ""
  document.getElementById("leitura-toner").value = ""
  document.getElementById("leitura-troca").checked = false
  document.getElementById("leitura-observacao").value = ""

  const hoje = new Date().toISOString().split("T")[0]
  const leiturasHoje = listaLeituras.filter(
    l => String(l.impressoraId) === String(impressora.id) && l.data === hoje
  )
  document.getElementById("leitura-sequencia").value = leiturasHoje.length + 1

  document.getElementById("modal-leitura").classList.add("active")
}

function fecharModalLeitura() {
  document.getElementById("modal-leitura").classList.remove("active")
  impressoraAtual = null
}

// =============================================
// SALVAR LEITURA
// =============================================
async function salvarLeitura(e) {
  e.preventDefault()

  if (!impressoraAtual) return

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
      impressoraId: impressoraAtual.id,
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
  await carregarLeituras()
  aplicarFiltros()
}

// =============================================
// CARREGAR IMPRESSORAS E LEITURAS
// =============================================
async function carregarImpressoras() {
  const { data, error } = await db
    .from("impressoras")
    .select("*")

  if (error) {
    console.error("Erro ao carregar impressoras:", error)
    return
  }

  listaImpressoras = data || []
}

async function carregarLeituras() {
  const { data, error } = await db
    .from("paginasImpressas")
    .select("*")
    .order("data", { ascending: false })
    .order("sequenciaDia", { ascending: false })

  if (error) {
    console.error("Erro ao carregar leituras:", error)
    return
  }

  listaLeituras = data || []
}

async function inicializarPrintmap() {
  await Promise.all([carregarImpressoras(), carregarLeituras()])

  popularFiltroSetor()
  popularFiltroTipo()
  renderizarImpressoras(listaImpressoras)
}

// =============================================
// RENDERIZAR CARDS
// =============================================
function renderizarImpressoras(lista){

  const container = document.getElementById("printmap")
  container.innerHTML = ""

  if(lista.length === 0){
    container.innerHTML = "<p>Nenhuma impressora encontrada</p>"
    return
  }

  lista.forEach(printer => {

    let ip = printer.enderecoip

    let webLink = ip && ip !== "192.168.0.1"
      ? `<a href="http://${ip}" target="_blank">🌐 Web</a>`
      : `<span class="no-web">Sem Web</span>`

    let statusClass = ""

    if(printer.status === "uso") statusClass = "uso"
    if(printer.status === "manutencao") statusClass = "manutencao"
    if(printer.status === "inativo") statusClass = "inativo"

    let propriedade = printer.propriedade === "locacao"
      ? "🏢 Locação"
      : "📦 Próprio"

    const card = document.createElement("div")
    card.className = "printer"

    // Última leitura vem de paginasImpressas agora, não de um campo solto
    // em impressoras (que nem existe mais na tabela).
    const ultima = ultimaLeituraDaImpressora(printer.id)
    let leituraDisplay = ultima ? Number(ultima.contadorAtual).toLocaleString("pt-BR") : "—"

    card.innerHTML = `
      <div class="icon">🖨️</div>
      <h3>${printer.modelo}</h3>
      <p>${printer.setor}</p>
      <p class="tipo">${propriedade}</p>
      <p class="status ${statusClass}">
        ${printer.status}
      </p>
      <div class="links">
        ${webLink}
      </div>
      <div class="leitura-info">
        <button class="btn-leitura">📊 Leitura</button>
        <span class="ultima-leitura">${leituraDisplay}</span>
      </div>
    `

    card.querySelector(".btn-leitura").addEventListener("click", () => {
      abrirModalLeitura(printer)
    })

    container.appendChild(card)
  })
}

// =============================================
// POPULAR FILTRO DE SETOR
// =============================================
function popularFiltroSetor() {

  const select = document.getElementById("filtro-setor")

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

// =============================================
// POPULAR FILTRO DE TIPO
// =============================================
function popularFiltroTipo() {

  const select = document.getElementById("filtro-tipo")

  const tiposUnicos = [...new Set(listaImpressoras.map(i => i.propriedade))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  tiposUnicos.forEach(tipo => {
    const option = document.createElement("option")
    option.value = tipo
    option.textContent = tipo === "locacao" ? "Locadas" : "Próprias"
    select.appendChild(option)
  })
}

// =============================================
// APLICAR FILTROS
// =============================================
function aplicarFiltros() {

  const setor = document.getElementById("filtro-setor").value
  const status = document.getElementById("filtro-status").value
  const tipo = document.getElementById("filtro-tipo").value

  let filtrado = listaImpressoras

  if (setor) {
    filtrado = filtrado.filter(p => p.setor === setor)
  }

  if (status) {
    filtrado = filtrado.filter(p => p.status === status)
  }

  if (tipo) {
    filtrado = filtrado.filter(p => p.propriedade === tipo)
  }

  renderizarImpressoras(filtrado)
}

// =============================================
// EVENTOS DOS FILTROS
// =============================================
document.getElementById("filtro-setor").addEventListener("change", aplicarFiltros)
document.getElementById("filtro-status").addEventListener("change", aplicarFiltros)
document.getElementById("filtro-tipo").addEventListener("change", aplicarFiltros)

// =============================================
// CARDS DE RESUMO
// =============================================

async function atualizarCards() {

  const { data: suprimentos, error: erroSup } = await db.from('reserva').select('*')
  const { data: registros, error: erroReg } = await db.from('registros').select('*')
  const { data: impressoras, error: erroImp } = await db.from('impressoras').select('*')

  if (erroSup || erroReg || erroImp) {
    console.error("Erro ao buscar dados:", erroSup, erroReg, erroImp)
    return
  }

  const impressorasUnicas = new Set(
    impressoras.map(s => s.modelo).filter(Boolean)
  ).size

  document.getElementById("totalImpressoras").textContent = impressorasUnicas

  const totalUnidades = (suprimentos || []).reduce(
    (t, s) => t + (Number(s.un) || 0), 0
  )

  document.getElementById("totalSuprimentos").textContent = totalUnidades

  const zerados = (suprimentos || []).filter(
    s => Number(s.un) <= 0
  ).length

  document.getElementById("suprimentosZerados").textContent = zerados

  if (!registros || registros.length === 0) {
    document.getElementById("topSuprimento").textContent = "—"
  } else {
    const contagem = {}

    registros.forEach(r => {
      contagem[r.suprimento] =
        (contagem[r.suprimento] || 0) + (Number(r.quantidade) || 0)
    })

    const ranking = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // TOP 3

    document.getElementById("topSuprimento").innerHTML =
      ranking.map(([nome]) => nome).join("<br>")
  }
}

// =============================================
// INICIALIZAÇÃO
// =============================================
inicializarPrintmap()
atualizarCards()
carregarPerfilUsuario()

// Event listeners do modal
document.querySelector(".close-btn").addEventListener("click", fecharModalLeitura)
document.querySelector(".btn-cancelar").addEventListener("click", fecharModalLeitura)
document.getElementById("form-leitura").addEventListener("submit", salvarLeitura)

document.getElementById("modal-leitura").addEventListener("click", (e) => {
  if (e.target.id === "modal-leitura") {
    fecharModalLeitura()
  }
})

// Event listener do botão Sair
document.getElementById("btn-sair").addEventListener("click", sair)