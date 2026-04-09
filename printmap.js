const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

let listaImpressoras = []

// =============================================
// CARREGAR IMPRESSORAS
// =============================================
async function carregarImpressoras(){

  const { data, error } = await db
    .from("impressoras")
    .select("*")

  if(error){
    console.error("Erro:", error)
    return
  }

  listaImpressoras = data || []

  popularFiltroSetor()
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
    `

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
// INICIALIZAÇÃO
// =============================================
carregarImpressoras()