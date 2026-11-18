const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins";

const { createClient } = window.supabase;
const supabaseIntegrador = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente próprio só para autenticação, isolado do cliente usado
// pela lógica de cada página (reserva.js, registro.js, etc.)
const dbAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
 
async function carregarPerfilUsuario() {
  const el = document.getElementById("perfil-email")
  if (!el) return
 
  const { data, error } = await dbAuth.auth.getUser()
 
  if (error || !data.user) {
    el.textContent = "Visitante"
    return
  }
 
  el.textContent = data.user.email
}
 
async function sair() {
  await dbAuth.auth.signOut()
  window.location.href = "/login.html"
}
 
document.addEventListener("DOMContentLoaded", () => {
  const btnSair = document.getElementById("btn-sair")
  if (btnSair) btnSair.addEventListener("click", sair)
 
  carregarPerfilUsuario()
})


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
// ENVIAR CARDS AO PIPEFY (VERCEL FUNCTION)
// Cada item gerado no relatório cria um card individual no Pipefy.
async function enviarAoPipefy() {
    if (!dadosGerados.length) {
        alert("Gere um relatório antes de enviar.");
        return;
    }

    const botao = document.getElementById("btn-enviar-pipefy");
    if (botao?.disabled) return;

    if (!confirm(`Serão enviados ${dadosGerados.length} registro(s), criando um card por registro no Pipefy. Deseja continuar?`)) {
        return;
    }

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Enviando...";
    }

    try {
        const { data: sessaoData, error: sessaoErro } = await supabaseIntegrador.auth.getSession();
        const accessToken = sessaoData?.session?.access_token;

        if (sessaoErro || !accessToken) {
            throw new Error("Sua sessão expirou. Entre novamente no sistema.");
        }

        const resposta = await fetch("/api/pipefy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                registros: dadosGerados.map(item => ({
                    tipo: item.tipo,
                    setor: item.setor,
                    suprimento: item.suprimento,
                    cor: item.cor || "",
                    quantidade: Number(item.un),
                    dataHora: item.dataHora || null
                }))
            })
        });

        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
            throw new Error(resultado.error || `Falha na integração (HTTP ${resposta.status}).`);
        }

        const criados = resultado.criados || [];
        const falhas = resultado.falhas || [];
        let mensagem = `${criados.length} card(s) criado(s) no Pipefy.`;

        if (criados.length) {
            mensagem += "\n\nCards criados:\n" + criados.map(card =>
                `${card.tipo} — ${card.setor} — ${card.suprimento}\n${card.url}`
            ).join("\n\n");
        }

        if (falhas.length) {
            mensagem += `\n\n${falhas.length} registro(s) não foram enviados:\n` +
                falhas.map(f => `${f.tipo} — ${f.setor} — ${f.suprimento}: ${f.error}`).join("\n");
        }

        alert(mensagem);
    } catch (error) {
        console.error("Erro ao enviar cards ao Pipefy:", error);
        alert(`Não foi possível concluir o envio: ${error.message}`);
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Enviar ao Pipefy";
        }
    }
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
window.enviarAoPipefy = enviarAoPipefy;
window.limparTudo = limparTudo;