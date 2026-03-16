const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins";

const { createClient } = window.supabase;
const supabaseIntegrador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// ESTADO GLOBAL
// ===============================
let conteudoEmail = ""

// ===============================
// BUSCAR DADOS (ESTOQUE + REGISTROS)
// ===============================
async function buscarDados(termo) {
    try {
        // Busca registros
        const { data: registros, error: erroReg } = await supabaseIntegrador
            .from("registros")
            .select("*")
            .or(`setor.ilike.%${termo}%,suprimento.ilike.%${termo}%`)
        if (erroReg) throw erroReg

        // Busca estoque
        const { data: reservas, error: erroRes } = await supabaseIntegrador
            .from("reserva")
            .select("*")
            .or(`setor.ilike.%${termo}%,suprimento.ilike.%${termo}%`)
        if (erroRes) throw erroRes

        // Formata os dados para o relatório
        const dadosFormatados = [
            ...(registros || []).map(r => ({
                setor: r.setor || "—",
                suprimento: r.suprimento,
                cor: r.cor || "",
                un: r.un,
                dataHora: r.dataHora || null,
                tipo: "REGISTRO"
            })),
            ...(reservas || []).map(r => ({
                setor: r.setor || "—",
                suprimento: r.suprimento,
                cor: r.cor || "",
                un: r.un,
                dataHora: null,
                tipo: "ESTOQUE"
            }))
        ]

        return dadosFormatados

    } catch (error) {
        console.error(error)
        alert("Erro ao buscar dados.")
        return null
    }
}

// =====================
// ORGANIZAR POR SETOR
// =====================
function organizarPorSetor(dados) {
    const setores = {}
    dados.forEach(r => {
        if (!setores[r.setor]) setores[r.setor] = []
        setores[r.setor].push(r)
    })
    return setores
}

// =================
// GERAR RELATÓRIO
// =================
function gerarRelatorio(dados) {
    if (!dados || !dados.length) {
        alert("Nenhum resultado encontrado.")
        return
    }

    const setores = organizarPorSetor(dados)
    let texto = "RELATÓRIO DE SUPRIMENTOS\n\n"

    Object.keys(setores).forEach(setor => {
        texto += `SETOR: ${setor}\n\n`
        setores[setor].forEach(r => {
            texto += `• ${r.suprimento}`
            if (r.cor) texto += ` (${r.cor})`
            texto += `\n  UN: ${r.un}\n`
            texto += `  Tipo: ${r.tipo}\n`
            if (r.dataHora) texto += `  Data: ${new Date(r.dataHora).toLocaleString("pt-BR")}\n`
            texto += "\n"
        })
        texto += "-----------------------------\n\n"
    })

    conteudoEmail = texto
    const preview = document.getElementById("previewConteudo")
    if (preview) preview.textContent = texto
}

// ======================
// RELATÓRIO REGISTROS
// ======================
async function gerarRegistros() {
    const { data, error } = await supabaseIntegrador
        .from("registros")
        .select("*")
        .order("dataHora", { ascending: false })
    if (error) {
        console.error(error)
        alert("Erro ao buscar registros.")
        return
    }

    const dadosFormatados = (data || []).map(r => ({
        setor: r.setor || "—",
        suprimento: r.suprimento,
        cor: r.cor || "",
        un: r.un,
        dataHora: r.dataHora,
        tipo: "REGISTRO"
    }))

    gerarRelatorio(dadosFormatados)
}

// =================
// RELATÓRIO ESTOQUE
// =================
async function gerarEstoque() {
    const { data, error } = await supabaseIntegrador
        .from("reserva")
        .select("*")
        .order("setor", { ascending: true })
    if (error) {
        console.error(error)
        alert("Erro ao buscar estoque.")
        return
    }

    const dadosFormatados = (data || []).map(r => ({
        setor: r.setor || "—",
        suprimento: r.suprimento,
        cor: r.cor || "",
        un: r.un,
        dataHora: null,
        tipo: "ESTOQUE"
    }))

    gerarRelatorio(dadosFormatados)
}

// ===============================
// ENVIAR EMAIL
// ===============================
function enviarEmail() {
    if (!conteudoEmail) {
        alert("Gere um relatório antes de enviar.")
        return
    }

    const email = document.getElementById("emailRemetente")
    const mensagem = document.getElementById("mensagemEmail")
    const form = document.getElementById("formPipefy")

    if (email) email.value = "gerenciadorsuprimentosgi@cambai.com"
    const subject = document.querySelector('input[name="_subject"]')
    if (subject) subject.value = "Relatório de suprimentos"
    if (mensagem) mensagem.value = conteudoEmail
    if (form) form.submit()

    alert("Relatório enviado ao Pipefy!")
}

// ===============================
// LIMPAR SISTEMA
// ===============================
function limparTudo() {
    const input = document.getElementById("input-search")
    const preview = document.getElementById("previewConteudo")

    if (input) input.value = ""
    if (preview) preview.textContent = ""
    conteudoEmail = ""
}

// ===============================
// EVENTOS
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const btnSearch = document.getElementById("btn-search")
    const inputSearch = document.getElementById("input-search")

    if (btnSearch) {
        btnSearch.addEventListener("click", async function () {
            const termo = inputSearch.value.trim()
            if (!termo) {
                alert("Digite um setor ou suprimento.")
                return
            }
            const dados = await buscarDados(termo)
            if (!dados) return
            gerarRelatorio(dados)
        })
    }
})

// ===============================
// EXPOSIÇÃO GLOBAL
// ===============================
window.gerarRegistros = gerarRegistros
window.gerarEstoque = gerarEstoque
window.enviarEmail = enviarEmail
window.limparTudo = limparTudo