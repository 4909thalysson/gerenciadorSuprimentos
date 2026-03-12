const SUPABASE_URL = 'https://kxiapqtfwdwiqnvqjtkf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins'

const { createClient } = window.supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener("DOMContentLoaded", async () => {
  const selectImpressora = document.getElementById("impressoraSelect")
  const inputUnidade = document.getElementById("unidade")
  const inputColaborador = document.getElementById("colaborador")
  const btnRegistrar = document.getElementById("registrar")
  const tabela = document.getElementById("tabela-registros")
  const selecionarTodos = document.getElementById("selecionar-todos")
  const btnExcluir = document.getElementById("excluirRegistro")

  async function getSuprimentos() {
    const { data } = await supabase.from('reserva').select('*')
    return data || []
  }

  async function preencherImpressoras() {
    const suprimentos = await getSuprimentos()
    const impressorasUnicas = [...new Set(suprimentos.map(s => s.impressora))].sort()
    selectImpressora.innerHTML = "<option value=''>Selecione uma impressora</option>"
    impressorasUnicas.forEach(imp => {
      const opt = document.createElement("option")
      opt.value = imp
      opt.textContent = imp
      selectImpressora.appendChild(opt)
    })
  }

  async function mostrarTonerDaImpressora() {
    const impressora = selectImpressora.value
    const suprimentos = await getSuprimentos()
    const toners = suprimentos.filter(s => s.impressora === impressora)

    const infoAntiga = document.getElementById("info-suprimento")
    if (infoAntiga) infoAntiga.remove()

    const selectToner = document.getElementById("suprimentoSelect")
    selectToner.innerHTML = "<option value=''>Selecione o suprimento</option>"

    if (!impressora || toners.length === 0) {
      selectToner.disabled = true
    } else {
      selectToner.disabled = false
      toners.forEach(item => {
        const opt = document.createElement("option")
        opt.value = item.id
        opt.textContent = `${item.suprimento} (${item.cor}) → ${item.un} un`
        if (item.un <= 0) opt.disabled = true
        selectToner.appendChild(opt)
      })
    }

    const info = document.createElement("div")
    info.id = "info-suprimento"
    info.style.cssText = `margin:16px 0;padding:14px;background:#fff8f2;border:2px solid #F15A24;border-radius:10px;font-weight:bold;color:#D4380D;font-size:15px;text-align:center;`

    if (!impressora) {
      info.textContent = "Selecione uma impressora para ver os suprimentos disponíveis"
    } else {
      const ip = toners[0]?.enderecoip || "Não informado"
      info.innerHTML = `<strong>${impressora}</strong><br>IP: ${ip}<br>Cores disponíveis: ${toners.length}`
    }
    selectImpressora.parentNode.appendChild(info)
  }

  // REGISTRAR RETIRADA
  async function registrarRetirada() {
    const impressora = selectImpressora.value
    const suprimentoId = document.getElementById("suprimentoSelect").value
    const quantidade = Number(inputUnidade.value)
    const colaborador = inputColaborador?.value.trim() || "Não informado"

    if (!impressora || !suprimentoId || quantidade <= 0) {
      return alert("Preencha todos os campos obrigatórios!")
    }

    const suprimentos = await getSuprimentos()
    const item = suprimentos.find(s => s.id == suprimentoId)

    if (!item || item.un < quantidade) {
      return alert("Suprimento não encontrado ou estoque insuficiente!")
    }

    const { error } = await supabase.from('registros').insert({
      impressora: item.impressora,
      suprimento: item.suprimento,
      un: quantidade,
      colaborador: colaborador,
      dataHora: new Date().toISOString()
    })

    if (error) return alert("Erro ao salvar: " + error.message)

    await supabase.from('reserva').update({ un: item.un - quantidade }).eq('id', item.id)

    inputUnidade.value = ""
    if (inputColaborador) inputColaborador.value = ""
    await mostrarTonerDaImpressora()
    await exibirRegistros()
  }

  // EXIBIR REGISTROS — COM data-label PARA CARDS NO CELULAR
  async function exibirRegistros() {
    const { data: registros } = await supabase
      .from('registros')
      .select('*')
      .order('dataHora', { ascending: false })

    if (!registros || registros.length === 0) {
      tabela.innerHTML = `
        <tr>
          <td colspan="6" style="padding:120px 20px;text-align:center;font-size:19px;color:#999;font-style:italic;background:#fdfdfd;border:none;">
            Nenhum registro encontrado
          </td>
        </tr>
      `
      return
    }

    tabela.innerHTML = registros.map(r => `
      <tr>
        <td><input type="checkbox" class="checkbox-registro" data-id="${r.id}"></td>
        <td data-label="Impressora">${r.impressora}</td>
        <td data-label="Suprimento">${r.suprimento}</td>
        <td data-label="UN">${r.un}</td>
        <td data-label="Colaborador">${r.colaborador || "—"}</td>
        <td data-label="Data/Hora">${new Date(r.dataHora).toLocaleString("pt-BR")}</td>
      </tr>
    `).join("")
  }

  // EXCLUIR + SELECIONAR TODOS
  btnExcluir?.addEventListener("click", async () => {
    const selecionados = document.querySelectorAll(".checkbox-registro:checked")
    if (selecionados.length === 0) return alert("Selecione ao menos um!")
    if (!confirm(`Excluir ${selecionados.length} registro(s) permanentemente?`)) return

    const ids = Array.from(selecionados).map(cb => Number(cb.dataset.id))
    await supabase.from('registros').delete().in('id', ids)
    alert("Registros excluídos com sucesso!")
    await exibirRegistros()
  })

  selecionarTodos?.addEventListener("change", () => {
    document.querySelectorAll(".checkbox-registro").forEach(cb => cb.checked = selecionarTodos.checked)
  })

  // EVENTOS
  selectImpressora.addEventListener("change", mostrarTonerDaImpressora)
  btnRegistrar.addEventListener("click", registrarRetirada)

  // REALTIME
  supabase.channel('registros').on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, exibirRegistros).subscribe()

  // EXPORTAR EXCEL
  document.getElementById("exportar")?.addEventListener("click", async () => {
    const { data } = await supabase.from('registros').select('*')
    if (!data?.length) return alert("Nada para exportar!")

    const ordenados = data.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))

    const dadosExcel = ordenados.map(r => ({
      "Data/Hora": new Date(r.dataHora).toLocaleString("pt-BR"),
      "Impressora": r.impressora,
      "Suprimento": r.suprimento,
      "UN": r.un,
      "Colaborador": r.colaborador || "—"
    }))

    const ws = XLSX.utils.json_to_sheet(dadosExcel)
    ws['!cols'] = [{wch:20},{wch:40},{wch:20},{wch:10},{wch:10},{wch:25}]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Retiradas")
    XLSX.writeFile(wb, `Retiradas_Suprimentos_Cambai_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.xlsx`)
    alert(`Exportado ${data.length} registros!`)
  })

  // INICIALIZAÇÃO
  await preencherImpressoras()
  await exibirRegistros()
  await mostrarTonerDaImpressora()
})