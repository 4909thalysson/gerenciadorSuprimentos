const SUPABASE_URL = 'https://kxiapqtfwdwiqnvqjtkf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins'

const { createClient } = window.supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener("DOMContentLoaded", async () => {

  const tabela = document.getElementById("tabela")
  const btnSalvar = document.getElementById("salvar")
  const selecionarTodos = document.getElementById("selecionar-todos")
  const btnExcluir = document.getElementById("excluirRegistro")

  // =============================================
  // CARREGAR LISTA DE IMPRESSORAS (SELECT)
  // =============================================
  async function carregarListaImpressoras() {

    const select = document.getElementById("impressora")

    const { data, error } = await supabase
      .from("impressoras")
      .select("modelo, setor")
      .order("modelo", { ascending: true })

    if (error) {
      console.error("Erro ao carregar impressoras:", error)
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
  // CARREGAR E ATUALIZAR TABELA
  // =============================================
  async function atualizarTabela() {

    const { data: suprimentos } = await supabase
      .from('reserva')
      .select('*')
      .order('impressora', { ascending: true })

    tabela.innerHTML = ""

    if (!suprimentos || suprimentos.length === 0) {
      tabela.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 40px; color: #999; font-style: italic;">
            Nenhum suprimento cadastrado
          </td>
        </tr>
      `
      return
    }

    suprimentos.forEach(item => {
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

  // ========================
  // SALVAR NOVO SUPRIMENTO
  // ========================
  btnSalvar?.addEventListener("click", async () => {

    const suprimento = document.getElementById("suprimento").value.trim()
    const impressora = document.getElementById("impressora").value
    const setor = document.getElementById("setor").value.trim()
    const quantidade = Number(document.getElementById("quantidade").value)
    const corSelecionada = document.querySelector('input[name="cor"]:checked')
    const valor = document.getElementById("valor").value.trim().replace(",", ".")

    if (!suprimento || !impressora || !corSelecionada || !quantidade || quantidade < 1) {
      alert("Preencha todos os campos obrigatórios!")
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

  // =============================================
  // LIMPAR FORMULÁRIO
  // =============================================
  function limparFormulario() {
    document.getElementById("suprimento").value = ""
    document.getElementById("impressora").value = ""
    document.getElementById("setor").value = ""
    document.getElementById("quantidade").value = "1"
    document.querySelectorAll('input[name="cor"]').forEach(r => r.checked = false)
    document.getElementById("valor").value = ""
  }

  // =============================================
  // EXCLUIR SUPRIMENTOS
  // =============================================
  btnExcluir?.addEventListener("click", async () => {

    const selecionados = document.querySelectorAll(".checkbox-registro:checked")

    if (selecionados.length === 0) {
      return alert("Selecione pelo menos um item para excluir!")
    }

    if (!confirm(`Excluir ${selecionados.length} suprimento(s) permanentemente?`)) return

    const ids = Array.from(selecionados).map(cb => Number(cb.dataset.id))

    const { error } = await supabase
      .from('reserva')
      .delete()
      .in('id', ids)

    if (error) {
      alert("Erro ao excluir: " + error.message)
      return
    }

    alert("Suprimentos excluídos com sucesso!")
    selecionarTodos.checked = false

    await atualizarTabela()
    await atualizarCards()
  })

  // =============================================
  // CHECKBOX "SELECIONAR TODOS"
  // =============================================
  selecionarTodos?.addEventListener("change", () => {
    document.querySelectorAll(".checkbox-registro").forEach(cb => {
      cb.checked = selecionarTodos.checked
    })
  })

  // =============================================
  // CARDS
  // =============================================
  async function atualizarCards() {

    const { data: suprimentos } = await supabase.from('reserva').select('*')
    const { data: registros } = await supabase.from('registros').select('*')

    const impressorasUnicas = new Set(
      suprimentos.map(s => s.impressora).filter(i => i)
    ).size

    document.getElementById("totalImpressoras").textContent = impressorasUnicas

    const totalUnidades = suprimentos.reduce((total, s) => {
      return total + (Number(s.un) || 0)
    }, 0)

    document.getElementById("totalSuprimentos").textContent = totalUnidades

    const zerados = suprimentos.filter(s => s.un <= 0).length
    document.getElementById("suprimentosZerados").textContent = zerados

    if (!registros || registros.length === 0) {
      document.getElementById("topSuprimento").textContent = "—"
    } else {
      const contagem = {}

      registros.forEach(r => {
        contagem[r.suprimento] = (contagem[r.suprimento] || 0) + r.quantidade
      })

      const maisUsado = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])[0]

      document.getElementById("topSuprimento").textContent =
        `${maisUsado[0]} (${maisUsado[1]} un)`
    }
  }

  // =============================================
  // REALTIME
  // =============================================
  supabase.channel('reserva-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reserva' }, () => {
      atualizarTabela()
      atualizarCards()
    })
    .subscribe()

  supabase.channel('registros-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, atualizarCards)
    .subscribe()

  // =============================================
  // INICIALIZAÇÃO
  // =============================================
  await carregarListaImpressoras()
  await atualizarTabela()
  await atualizarCards()

})