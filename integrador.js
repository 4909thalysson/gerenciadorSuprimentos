const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins";

const { createClient } = window.supabase;
const supabaseIntegrador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// ESTADO GLOBAL CONTROLADO
// ===============================
let conteudoEmail = "";
let relatorioAtual = "";

// ===============================
// BUSCAR IMPRESSORA
// ===============================
async function buscarImpressora(termo) {

    const { data: reservas, error: errorReservas } = await supabaseIntegrador
        .from("reserva")
        .select("*")
        .ilike("impressora", `%${termo}%`);

    const { data: registros, error: errorRegistros } = await supabaseIntegrador
        .from("registros")
        .select("*")
        .ilike("impressora", `%${termo}%`);

    if (errorReservas || errorRegistros) {
        console.error(errorReservas || errorRegistros);
        alert("Erro ao buscar dados.");
        return null;
    }

    return {
        reservas: reservas || [],
        registros: registros || []
    };
}

// ===============================
// GERAR RELATÓRIO FILTRADO
// ===============================
function gerarRelatorioFiltrado(resultado) {

    if (!resultado.reservas.length && !resultado.registros.length) {
        alert("Nenhum resultado encontrado.");
        return;
    }

    let texto = "RELATÓRIO FILTRADO POR IMPRESSORA\n\n";

    if (resultado.reservas.length) {
        texto += "=== RESERVAS ===\n\n";

        resultado.reservas.forEach(r => {
            texto += `Impressora: ${r.impressora}\n`;
            texto += `Suprimento: ${r.suprimento}\n`;
            texto += `Cor: ${r.cor}\n`;
            texto += `Unidades: ${r.un}\n`;
            texto += `IP: ${r.enderecoip}\n`;
            texto += `Valor: ${r.valor ?? "N/A"}\n`;
            texto += "---------------------------\n";
        });
    }

    if (resultado.registros.length) {
        texto += "\n=== REGISTROS ===\n\n";

        resultado.registros.forEach(r => {
            texto += `Impressora: ${r.impressora}\n`;
            texto += `Suprimento: ${r.suprimento}\n`;
            texto += `Unidades: ${r.un}\n`;
            texto += `Data: ${new Date(r.dataHora).toLocaleString()}\n`;
            texto += `Colaborador: ${r.colaborador}\n`;
            texto += "---------------------------\n";
        });
    }

    conteudoEmail = texto;
    relatorioAtual = "impressora_filtrada";

    document.getElementById("previewConteudo").textContent = texto;
}

// ===============================
// RELATÓRIO COMPLETO - RESERVAS
// ===============================
async function gerarReservas() {

    const { data, error } = await supabaseIntegrador
        .from("reserva")
        .select("*");

    if (error) {
        console.error(error);
        alert("Erro ao buscar reservas.");
        return;
    }

    if (!data.length) {
        alert("Nenhuma reserva encontrada.");
        return;
    }

    let texto = "RELATÓRIO DE RESERVAS\n\n";

    data.forEach(r => {
        texto += `Impressora: ${r.impressora}\n`;
        texto += `Suprimento: ${r.suprimento}\n`;
        texto += `Cor: ${r.cor}\n`;
        texto += `Unidades: ${r.un}\n`;
        texto += `IP: ${r.enderecoip}\n`;
        texto += `Valor: ${r.valor ?? "N/A"}\n`;
        texto += "---------------------------\n";
    });

    conteudoEmail = texto;
    relatorioAtual = "reservas";

    document.getElementById("previewConteudo").textContent = texto;
}

// ===============================
// RELATÓRIO COMPLETO - REGISTROS
// ===============================
async function gerarRegistros() {

    const { data, error } = await supabaseIntegrador
        .from("registros")
        .select("*")
        .order("dataHora", { ascending: false });

    if (error) {
        console.error(error);
        alert("Erro ao buscar registros.");
        return;
    }

    if (!data.length) {
        alert("Nenhum registro encontrado.");
        return;
    }

    let texto = "RELATÓRIO DE REGISTROS\n\n";

    data.forEach(r => {
        texto += `Impressora: ${r.impressora}\n`;
        texto += `Suprimento: ${r.suprimento}\n`;
        texto += `Unidades: ${r.un}\n`;
        texto += `Data: ${new Date(r.dataHora).toLocaleString()}\n`;
        texto += `Colaborador: ${r.colaborador}\n`;
        texto += "---------------------------\n";
    });

    conteudoEmail = texto;
    relatorioAtual = "registros";

    document.getElementById("previewConteudo").textContent = texto;
}

// ===============================
// ENVIAR EMAIL
// ===============================
function enviarEmail() {

    if (!conteudoEmail) {
        alert("Gere um relatório antes de enviar.");
        return;
    }

    document.getElementById("emailRemetente").value =
        "gerenciadorsuprimentosgi@cambai.com";

    const assunto = `RELATÓRIO - ${relatorioAtual.toUpperCase()}\n\n`;

    document.getElementById("mensagemEmail").value =
        assunto + conteudoEmail;

    document.getElementById("formPipefy").submit();

    alert("Enviado ao Pipefy com sucesso!");
}

function limparTudo() {

    // Captura elementos corretamente
    const inputSearch = document.getElementById("input-search");
    const preview = document.getElementById("previewConteudo");

    //Limpa campo de busca
    if (inputSearch) inputSearch.value = "";

    //Limpa preview do relatório
    if (preview) preview.textContent = "";

    //Limpa estado interno
    conteudoEmail = "";
    relatorioAtual = "";

    // Limpa formulário de envio (se existir)
    const mensagemEmail = document.getElementById("mensagemEmail");
    if (mensagemEmail) mensagemEmail.value = "";

    console.log("Sistema resetado com sucesso.");
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

        const resultado = await buscarImpressora(termo);

        if (!resultado) return;

        gerarRelatorioFiltrado(resultado);
    });

});

// ================
// EXPOSIÇÃO GLOBAL 
// ================
window.gerarReservas = gerarReservas;
window.gerarRegistros = gerarRegistros;
window.enviarEmail = enviarEmail;
window.limparTudo = limparTudo;