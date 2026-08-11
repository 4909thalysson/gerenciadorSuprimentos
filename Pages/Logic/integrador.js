const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins";

const { createClient } = window.supabase;
const supabaseIntegrador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// ESTADO GLOBAL
// ===============================
let conteudoEmail = "";
let dadosGerados = [];
let relatorioAtual = "";

// ===============================
// BUSCAR DADOS (FILTRO)
// ===============================
async function buscarDados(termo) {
    try {
        const { data: registros, error: erroReg } = await supabaseIntegrador
            .from("registros")
            .select("*")
            .or(`setor.ilike.%${termo}%,suprimento.ilike.%${termo}%`);

        if (erroReg) throw erroReg;

        const { data: reservas, error: erroRes } = await supabaseIntegrador
            .from("reserva")
            .select("*")
            .or(`setor.ilike.%${termo}%,suprimento.ilike.%${termo}%`);

        if (erroRes) throw erroRes;

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
        ];

        return dadosFormatados;

    } catch (error) {
        console.error(error);
        alert("Erro ao buscar dados.");
        return null;
    }
}

// ===============================
// ORGANIZAR POR SETOR
// ===============================
function organizarPorSetor(dados) {
    const setores = {};

    dados.forEach(r => {
        if (!setores[r.setor]) setores[r.setor] = [];
        setores[r.setor].push(r);
    });

    return setores;
}

// ===============================
// GERAR RELATÓRIO
// ===============================
function gerarRelatorio(dados) {
    if (!dados || !dados.length) {
        alert("Nenhum resultado encontrado.");
        return;
    }

    const setores = organizarPorSetor(dados);

    let texto = "RELATÓRIO DE SUPRIMENTOS\n\n";

    Object.keys(setores).forEach(setor => {
        texto += `SETOR: ${setor}\n\n`;

        setores[setor].forEach(r => {
            texto += `• ${r.suprimento}`;
            if (r.cor) texto += ` (${r.cor})`;

            texto += `\n  UN: ${r.un}`;
            texto += `\n  Tipo: ${r.tipo}`;

            if (r.dataHora) {
                texto += `\n  Data: ${new Date(r.dataHora).toLocaleString("pt-BR")}`;
            }

            texto += "\n\n";
        });

        texto += "-----------------------------\n\n";
    });

    conteudoEmail = texto;
    dadosGerados = dados;

    const preview = document.getElementById("previewConteudo");
    if (preview) preview.textContent = texto;
}

// ===============================
// RELATÓRIO REGISTROS
// ===============================
async function gerarRegistros() {
    relatorioAtual = "REGISTROS";

    const { data, error } = await supabaseIntegrador
        .from("registros")
        .select("*")
        .order("dataHora", { ascending: false });

    if (error) {
        console.error(error);
        alert("Erro ao buscar registros.");
        return;
    }

    const dadosFormatados = (data || []).map(r => ({
        setor: r.setor || "—",
        suprimento: r.suprimento,
        cor: r.cor || "",
        un: r.un,
        dataHora: r.dataHora,
        tipo: "REGISTRO"
    }));

    gerarRelatorio(dadosFormatados);
}

// ===============================
// RELATÓRIO ESTOQUE
// ===============================
async function gerarEstoque() {
    relatorioAtual = "ESTOQUE";

    const { data, error } = await supabaseIntegrador
        .from("reserva")
        .select("*")
        .order("setor", { ascending: true });

    if (error) {
        console.error(error);
        alert("Erro ao buscar estoque.");
        return;
    }

    const dadosFormatados = (data || []).map(r => ({
        setor: r.setor || "—",
        suprimento: r.suprimento,
        cor: r.cor || "",
        un: r.un,
        dataHora: null,
        tipo: "ESTOQUE"
    }));

    gerarRelatorio(dadosFormatados);
}

// ===============================
// ENVIAR EMAIL (FORMSPREE)
// ===============================
function enviarEmail() {

    if (!conteudoEmail) {
        alert("Gere um relatório antes de enviar.");
        return;
    }

    document.getElementById("emailRemetente").value =
        "gerenciadorsuprimentosgi@cambai.com";

    const assunto = `RELATÓRIO - ${relatorioAtual || "GERAL"}\n\n`;

    document.getElementById("mensagemEmail").value =
        assunto + conteudoEmail;

    document.getElementById("formPipefy").submit();
}

// ===============================
// LIMPAR SISTEMA
// ===============================
function limparTudo() {

    const inputSearch = document.getElementById("input-search");
    const preview = document.getElementById("previewConteudo");
    const mensagemEmail = document.getElementById("mensagemEmail");

    if (inputSearch) inputSearch.value = "";
    if (preview) preview.textContent = "";
    if (mensagemEmail) mensagemEmail.value = "";

    conteudoEmail = "";
    dadosGerados = [];
    relatorioAtual = "";

    console.log("Sistema resetado.");
}

// ===============================
// EVENTOS
// ===============================
document.addEventListener("DOMContentLoaded", function () {

    const btnSearch = document.getElementById("btn-search");
    const inputSearch = document.getElementById("input-search");

    btnSearch.addEventListener("click", async function () {

        const termo = inputSearch.value.trim();

        if (!termo) {
            alert("Digite o nome da impressora.");
            return;
        }

        relatorioAtual = "FILTRO";

        const resultado = await buscarDados(termo);

        if (!resultado) return;

        gerarRelatorio(resultado);
    });

    // ENTER no input
    inputSearch.addEventListener("keyup", async function (e) {
        if (e.key === "Enter") {
            btnSearch.click();
        }
    });

});

// ===============================
// EXPOSIÇÃO GLOBAL (HTML)
// ===============================
window.gerarReservas = gerarEstoque;
window.gerarRegistros = gerarRegistros;
window.enviarEmail = enviarEmail;
window.limparTudo = limparTudo;