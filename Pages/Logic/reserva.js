const SUPABASE_URL = 'https://kxiapqtfwdwiqnvqjtkf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins'

const { createClient } = window.supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener("DOMContentLoaded", async () => {

  const tabela = document.getElementById("tabela")
  const btnSalvar = document.getElementById("salvar")
  const selecionarTodos = document.getElementById("selecionar-todos")
  const btnExcluir = document.getElementById("excluirRegistro")

  let dadosEstoque = [] 

// =============================================
// CARREGAR LISTA DE IMPRESSORAS
// =============================================
async function carregarListaImpressoras() {

  const select = document.getElementById("impressora")

  const { data, error } = await supabase
    .from("impressoras")
    .select("modelo, setor")
    .order("modelo", { ascending: true })

  if (error) {
    console.error(error)
    select.innerHTML = `<option value="">Erro ao carregar</option>`
    return
  }

  select.innerHTML = `<option value="">Selecione uma impressora</option>`

  data.forEach(item => {
    const option = document.createElement("option")
    option.value = item.modelo
    option.textContent = `${item.modelo} (${item.setor})`
    select.appendChild(option)
  })
}

// =============================================
// AUTO PREENCHER SETOR
// =============================================
document.getElementById("impressora").addEventListener("change", function() {
  const selected = this.options[this.selectedIndex].text
  const setorMatch = selected.match(/\((.*?)\)/)

  if(setorMatch){
    document.getElementById("setor").value = setorMatch[1]
  }
})

// =============================================
// RENDERIZAR TABELA
// =============================================
function renderizarTabela(dados) {

  tabela.innerHTML = ""

  if (!dados || dados.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 40px; color: #999;">
          Nenhum suprimento encontrado
        </td>
      </tr>
    `
    return
  }

  dados.forEach(item => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td><input type="checkbox" class="checkbox-registro" data-id="${item.id}"></td>
      <td>${item.suprimento}</td>
      <td>${item.impressora}</td>
      <td>${item.setor}</td>     
      <td>${item.cor}</td>
      <td>${item.un}</td>
      <td>${item.valor ? `R$ ${Number(item.valor).toFixed(2)}` : '—'}</td>
    `

    tabela.appendChild(row)
  })
}

// =============================================
// PREENCHER FILTRO
// =============================================
function preencherFiltroSetor(dados) {

  const select = document.getElementById("filtro-setor")

  const setores = [...new Set(dados.map(d => d.setor).filter(Boolean))]

  select.innerHTML = `<option value="">Todos os setores</option>`

  setores.forEach(setor => {
    const option = document.createElement("option")
    option.value = setor
    option.textContent = setor
    select.appendChild(option)
  })
}

// =============================================
// APLICAR FILTRO (ATUALIZADO)
// =============================================
function aplicarFiltro() {

  const setor = document.getElementById("filtro-setor").value
  const qtd = document.getElementById("qtd").value

  let filtrados = [...dadosEstoque]

  // Filtro por setor
  if (setor) {
    filtrados = filtrados.filter(item => item.setor === setor)
  }

  // Filtro por quantidade
  if (qtd === "0") {
    filtrados = filtrados.filter(item => Number(item.un) === 0)
  } 
  // (Opcional futuro)
  else if (qtd === "comQtd") {
    filtrados = filtrados.filter(item => Number(item.un) > 0)
  }

  renderizarTabela(filtrados)
}

// =============================================
// EVENTOS DOS FILTROS
// =============================================
document.getElementById("filtro-setor").addEventListener("change", aplicarFiltro)
document.getElementById("qtd").addEventListener("change", aplicarFiltro)
  // =============================================
  // CARREGAR DADOS
  // =============================================
  async function atualizarTabela() {

    const { data: suprimentos } = await supabase
      .from('reserva')
      .select('*')
      .order('impressora', { ascending: true })

    dadosEstoque = suprimentos || []

    preencherFiltroSetor(dadosEstoque)
    aplicarFiltro() // 🔥 já aplica filtro ativo
  }

  // =============================================
  // SALVAR
  // =============================================
  btnSalvar?.addEventListener("click", async () => {

    const suprimento = document.getElementById("suprimento").value.trim()
    const impressora = document.getElementById("impressora").value
    const setor = document.getElementById("setor").value.trim()
    const quantidade = Number(document.getElementById("quantidade").value)
    const corSelecionada = document.querySelector('input[name="cor"]:checked')
    const valor = document.getElementById("valor").value.trim().replace(",", ".")

    if (!suprimento || !impressora || !corSelecionada || !quantidade || quantidade < 1) {
      alert("Preencha os campos obrigatórios!")
      return
    }

    const { error } = await supabase
      .from('reserva')
      .insert({
        suprimento,
        impressora,
        setor,
        cor: corSelecionada.value,
        un: quantidade,
        valor: valor ? parseFloat(valor) : null
      })

    if (error) {
      alert("Erro ao salvar: " + error.message)
      return
    }

    limparFormulario()
    await atualizarTabela()
    await atualizarCards()
  })

  function limparFormulario() {
    document.getElementById("suprimento").value = ""
    document.getElementById("impressora").value = ""
    document.getElementById("setor").value = ""
    document.getElementById("quantidade").value = "1"
    document.querySelectorAll('input[name="cor"]').forEach(r => r.checked = false)
    document.getElementById("valor").value = ""
  }

  // =============================================
  // EXCLUIR
  // =============================================
  btnExcluir?.addEventListener("click", async () => {

    const selecionados = document.querySelectorAll(".checkbox-registro:checked")

    if (selecionados.length === 0) {
      return alert("Selecione itens!")
    }

    if (!confirm(`Excluir ${selecionados.length} item(s)?`)) return

    const ids = Array.from(selecionados).map(cb => Number(cb.dataset.id))

    const { error } = await supabase
      .from('reserva')
      .delete()
      .in('id', ids)

    if (error) {
      alert("Erro ao excluir: " + error.message)
      return
    }

    selecionarTodos.checked = false

    await atualizarTabela()
    await atualizarCards()
  })

  // =============================================
  // CHECKBOX TODOS
  // =============================================
  selecionarTodos?.addEventListener("change", () => {
    document.querySelectorAll(".checkbox-registro")
      .forEach(cb => cb.checked = selecionarTodos.checked)
  })

  // =============================================
  // EVENTO FILTRO
  // =============================================
  document.getElementById("filtro-setor")
    .addEventListener("change", aplicarFiltro)

  // =============================================
  // REALTIME
  // =============================================
  supabase.channel('reserva-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reserva' }, () => {
      atualizarTabela()
      atualizarCards()
    })
    .subscribe()

  // =============================================
  // EXPORTAR
  // =============================================
  document.getElementById("exportar").addEventListener("click", async () => {

    const { data } = await supabase.from("reserva").select("*")

    if (!data?.length) return alert("Nada para exportar")

    const dados = data.map(r => ({
      Suprimento: r.suprimento,
      Cor: r.cor,
      UN: r.un,
      Impressora: r.impressora,
      Setor: r.setor,
    }))

    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Estoque")
    XLSX.writeFile(wb, "estoque_suprimentos.xlsx")
  })

  // =============================================
  // INICIALIZAÇÃO
  // =============================================
  await carregarListaImpressoras()
  await atualizarTabela()
})