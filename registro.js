const SUPABASE_URL = 'https://kxiapqtfwdwiqnvqjtkf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins'

const { createClient } = window.supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let suprimentos = []

document.addEventListener("DOMContentLoaded", async () => {

  const selectSetor = document.getElementById("setorSelect")
  const selectToner = document.getElementById("suprimentoSelect")

  const inputUnidade = document.getElementById("unidade")
  const inputDataHora = document.getElementById("dataHora")

  const btnRegistrar = document.getElementById("registrar")
  const tabela = document.getElementById("tabela-registros")

  const selecionarTodos = document.getElementById("selecionar-todos")
  const btnExcluir = document.getElementById("excluirRegistro")

  const info = document.getElementById("info-suprimento")


  // CARREGAR SUPRIMENTOS
  async function carregarSuprimentos() {

    const { data, error } = await supabase
      .from("reserva")
      .select("*")

    if (error) {
      console.error("Erro ao carregar suprimentos", error)
      suprimentos = []
      return
    }

    suprimentos = data || []

  }



  // PREENCHER SETORES
  async function preencherSetores() {

    const setores = [...new Set(suprimentos.map(s => s.setor))].sort()

    selectSetor.innerHTML = "<option value=''>Selecione um setor</option>"

    setores.forEach(setor => {

      const opt = document.createElement("option")

      opt.value = setor
      opt.textContent = setor

      selectSetor.appendChild(opt)

    })

  }



  // PREENCHER SUPRIMENTOS PELO SETOR
  async function preencherSuprimentosPorSetor() {

    const setor = selectSetor.value

    selectToner.innerHTML = "<option value=''>Selecione o suprimento</option>"

    if (!setor) {

      selectToner.disabled = true
      info.innerHTML = "Selecione um setor para ver os suprimentos"
      return

    }

    const filtrado = suprimentos.filter(s => s.setor === setor)

    if (filtrado.length === 0) {

      selectToner.disabled = true
      info.innerHTML = "Nenhum suprimento encontrado neste setor"
      return

    }

    selectToner.disabled = false

    filtrado
      .sort((a, b) => a.un - b.un)
      .forEach(item => {

        const opt = document.createElement("option")

        opt.value = item.id
        opt.textContent =
          `${item.suprimento} (${item.cor}) → ${item.un} un`

        if (item.un <= 0) opt.disabled = true

        selectToner.appendChild(opt)

      })

    info.innerHTML = `
      <strong>${setor}</strong><br>
      ${filtrado.length} suprimentos cadastrados
    `
  }



  // REGISTRAR RETIRADA
  async function registrarRetirada() {

    const setor = selectSetor.value
    const suprimentoId = selectToner.value
    const quantidade = Number(inputUnidade.value)

    const dataHora = inputDataHora.value
      ? new Date(inputDataHora.value).toISOString()
      : new Date().toISOString()

    if (!setor || !suprimentoId || quantidade <= 0) {

      alert("Preencha todos os campos!")
      return

    }

    const item = suprimentos.find(s => s.id == suprimentoId)

    if (!item || item.un < quantidade) {

      alert("Estoque insuficiente!")
      return

    }

    const { error } = await supabase
      .from("registros")
      .insert({

        setor: setor,
        suprimento: item.suprimento,
        un: quantidade,
        dataHora: dataHora

      })

    if (error) {

      alert("Erro ao registrar: " + error.message)
      return

    }

    await supabase
      .from("reserva")
      .update({ un: item.un - quantidade })
      .eq("id", item.id)

    inputUnidade.value = ""

    await carregarSuprimentos()
    await preencherSuprimentosPorSetor()
    await exibirRegistros()

  }



  // EXIBIR HISTÓRICO
  async function exibirRegistros() {

    const { data } = await supabase
      .from("registros")
      .select("*")
      .order("dataHora", { ascending: false })

    if (!data || data.length === 0) {

      tabela.innerHTML = `
        <tr>
          <td colspan="5" style="padding:120px;text-align:center;color:#999;">
            Nenhum registro encontrado
          </td>
        </tr>
      `
      return

    }

    tabela.innerHTML = data.map(r => `

      <tr>

        <td>
          <input type="checkbox" class="checkbox-registro" data-id="${r.id}">
        </td>

        <td data-label="Setor">${r.setor}</td>
        <td data-label="Suprimento">${r.suprimento}</td>
        <td data-label="UN">${r.un}</td>
        <td data-label="Data/Hora">
          ${new Date(r.dataHora).toLocaleString("pt-BR")}
        </td>

      </tr>

    `).join("")

  }



  // EXCLUIR REGISTROS
  btnExcluir.addEventListener("click", async () => {

    const selecionados = document.querySelectorAll(".checkbox-registro:checked")

    if (selecionados.length === 0) {
      alert("Selecione ao menos um registro")
      return
    }

    if (!confirm("Excluir registros selecionados?")) return

    const ids = Array.from(selecionados).map(cb => Number(cb.dataset.id))

    await supabase
      .from("registros")
      .delete()
      .in("id", ids)

    await exibirRegistros()

  })



  // SELECIONAR TODOS
  selecionarTodos.addEventListener("change", () => {

    document
      .querySelectorAll(".checkbox-registro")
      .forEach(cb => cb.checked = selecionarTodos.checked)

  })



  // EVENTOS
  selectSetor.addEventListener("change", preencherSuprimentosPorSetor)

  btnRegistrar.addEventListener("click", registrarRetirada)



  // REALTIME
  supabase
    .channel("registros")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "registros" },
      exibirRegistros
    )
    .subscribe()



  // EXPORTAR EXCEL
  document.getElementById("exportar").addEventListener("click", async () => {

    const { data } = await supabase
      .from("registros")
      .select("*")

    if (!data || data.length === 0) {
      alert("Nada para exportar")
      return
    }

    const dados = data.map(r => ({

      "Setor": r.setor,
      "Suprimento": r.suprimento,
      "UN": r.un,
      "Data/Hora": new Date(r.dataHora).toLocaleString("pt-BR")

    }))

    const ws = XLSX.utils.json_to_sheet(dados)

    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, ws, "Retiradas")

    XLSX.writeFile(wb, "retiradas_suprimentos.xlsx")

  })



  // INICIALIZAÇÃO
  await carregarSuprimentos()
  await preencherSetores()
  await exibirRegistros()

})