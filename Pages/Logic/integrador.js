
const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins";

const { createClient } = window.supabase;

const supabaseIntegrador = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const dbAuth = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// ========================================
// ESTADO
// ========================================

let dadosGerados = [];
let registrosSelecionados = new Set();
let relatorioAtual = "";

// ========================================
// PERFIL E AUTENTICAÇÃO
// ========================================

async function carregarPerfilUsuario() {
    const elemento = document.getElementById("perfil-email");
    if (!elemento) return;

    const { data, error } = await dbAuth.auth.getUser();

    if (error || !data.user) {
        elemento.textContent = "Visitante";
        return;
    }

    elemento.textContent = data.user.email;
}

async function sair() {
    await dbAuth.auth.signOut();
    window.location.href = "/login.html";
}

// ========================================
// UTILITÁRIOS
// ========================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function obterModoEnvio() {
    return document.querySelector(
        'input[name="modo-envio"]:checked'
    )?.value || "INDIVIDUAL";
}

function obterSelecionados() {
    return [...registrosSelecionados]
        .sort((a, b) => a - b)
        .map(indice => dadosGerados[indice])
        .filter(Boolean);
}

function formatarData(data) {
    if (!data) return "—";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) return "—";

    return dataObj.toLocaleString("pt-BR");
}

// ========================================
// BUSCAR DADOS
// ========================================

async function buscarDados(termo) {
    try {
        const termoSeguro = termo.replace(/[%_]/g, "");

        const { data: registros, error: erroReg } =
            await supabaseIntegrador
                .from("registros")
                .select("*")
                .or(
                    `setor.ilike.%${termoSeguro}%,suprimento.ilike.%${termoSeguro}%`
                );

        if (erroReg) throw erroReg;

        const { data: reservas, error: erroRes } =
            await supabaseIntegrador
                .from("reserva")
                .select("*")
                .or(
                    `setor.ilike.%${termoSeguro}%,suprimento.ilike.%${termoSeguro}%`
                );

        if (erroRes) throw erroRes;

        return [
            ...(registros || []).map(registro => ({
                setor: registro.setor || "—",
                suprimento: registro.suprimento || "—",
                cor: registro.cor || "",
                un: registro.un,
                dataHora: registro.dataHora || null,
                tipo: "REGISTRO"
            })),

            ...(reservas || []).map(reserva => ({
                setor: reserva.setor || "—",
                suprimento: reserva.suprimento || "—",
                cor: reserva.cor || "",
                un: reserva.un,
                dataHora: null,
                tipo: "ESTOQUE"
            }))
        ];

    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        mostrarResultado("Não foi possível consultar os dados: " + error.message, "error");
        return null;
    }
}

// ========================================
// GERAR HISTÓRICO DE REGISTROS
// ========================================

async function gerarRegistros() {
    relatorioAtual = "REGISTROS";

    definirCarregamento(true);

    const { data, error } = await supabaseIntegrador
        .from("registros")
        .select("*")
        .order("dataHora", { ascending: false });

    definirCarregamento(false);

    if (error) {
        console.error(error);
        mostrarResultado("Erro ao consultar histórico: " + error.message, "error");
        return;
    }

    const dados = (data || []).map(registro => ({
        setor: registro.setor || "—",
        suprimento: registro.suprimento || "—",
        cor: registro.cor || "",
        un: registro.un,
        dataHora: registro.dataHora || null,
        tipo: "REGISTRO"
    }));

    carregarRegistros(dados, "Histórico de registros");
}

// ========================================
// GERAR ESTOQUE
// ========================================

async function gerarEstoque() {
    relatorioAtual = "ESTOQUE";

    definirCarregamento(true);

    const { data, error } = await supabaseIntegrador
        .from("reserva")
        .select("*")
        .order("setor", { ascending: true });

    definirCarregamento(false);

    if (error) {
        console.error(error);
        mostrarResultado("Erro ao consultar estoque: " + error.message, "error");
        return;
    }

    const dados = (data || []).map(reserva => ({
        setor: reserva.setor || "—",
        suprimento: reserva.suprimento || "—",
        cor: reserva.cor || "",
        un: reserva.un,
        dataHora: null,
        tipo: "ESTOQUE"
    }));

    carregarRegistros(dados, "Estoque completo");
}

// ========================================
// CARREGAR REGISTROS NA INTERFACE
// ========================================

function carregarRegistros(dados, origem) {
    dadosGerados = dados || [];

    // Por padrão, todos os registros carregados ficam selecionados.
    registrosSelecionados = new Set(
        dadosGerados.map((_, indice) => indice)
    );

    const texto = document.getElementById("texto-registros");

    if (texto) {
        texto.textContent = `${origem}: ${dadosGerados.length} resultado(s) encontrado(s).`;
    }

    const resultado = document.getElementById("resultado-envio");
    if (resultado) {
        resultado.hidden = true;
        resultado.textContent = "";
    }

    renderizarTabela();
    atualizarResumo();
    atualizarPrevia();
}

// ========================================
// RENDERIZAR TABELA
// ========================================

function renderizarTabela() {
    const tbody = document.getElementById("tabela-registros");
    if (!tbody) return;

    const contador = document.getElementById("contador-registros");

    if (contador) {
        contador.textContent = dadosGerados.length;
    }

    if (!dadosGerados.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Nenhum registro encontrado.
                </td>
            </tr>
        `;

        atualizarCheckboxTodos();
        return;
    }

    tbody.innerHTML = dadosGerados.map((registro, indice) => {
        const selecionado = registrosSelecionados.has(indice);

        const classeTipo = registro.tipo === "REGISTRO"
            ? "type-registro"
            : "type-estoque";

        const data = formatarData(registro.dataHora);

        return `
            <tr>
                <td>
                    <input
                        type="checkbox"
                        class="checkbox-registro"
                        data-indice="${indice}"
                        ${selecionado ? "checked" : ""}
                        aria-label="Selecionar registro ${indice + 1}"
                    >
                </td>

                <td>${escaparHTML(registro.setor)}</td>

                <td>
                    <strong>${escaparHTML(registro.suprimento)}</strong>
                </td>

                <td>${escaparHTML(registro.cor || "—")}</td>

                <td>${escaparHTML(registro.un ?? "—")}</td>

                <td>
                    <span class="type-tag ${classeTipo}">
                        ${escaparHTML(registro.tipo)}
                    </span>
                </td>

                <td>${escaparHTML(data)}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".checkbox-registro").forEach(checkbox => {
        checkbox.addEventListener("change", event => {
            const indice = Number(event.target.dataset.indice);

            if (event.target.checked) {
                registrosSelecionados.add(indice);
            } else {
                registrosSelecionados.delete(indice);
            }

            atualizarCheckboxTodos();
            atualizarResumo();
            atualizarPrevia();
        });
    });

    atualizarCheckboxTodos();
}

// ========================================
// SELEÇÃO DE TODOS OS REGISTROS
// ========================================

function atualizarCheckboxTodos() {
    const checkbox = document.getElementById("selecionar-todos");
    if (!checkbox) return;

    const total = dadosGerados.length;
    const selecionados = registrosSelecionados.size;

    checkbox.checked = total > 0 && selecionados === total;
    checkbox.indeterminate = selecionados > 0 && selecionados < total;
}

function selecionarTodos(estado) {
    registrosSelecionados.clear();

    if (estado) {
        dadosGerados.forEach((_, indice) => {
            registrosSelecionados.add(indice);
        });
    }

    renderizarTabela();
    atualizarResumo();
    atualizarPrevia();
}

function limparSelecao() {
    selecionarTodos(false);
}

// ========================================
// RESUMO DO ENVIO
// ========================================

function atualizarResumo() {
    const selecionados = obterSelecionados();
    const modo = obterModoEnvio();

    const cardsPrevistos = modo === "INDIVIDUAL"
        ? selecionados.length
        : selecionados.length > 0 ? 1 : 0;

    document.getElementById("resumo-selecionados").textContent =
        selecionados.length;

    document.getElementById("resumo-cards").textContent =
        cardsPrevistos;

    document.getElementById("resumo-modalidade").textContent =
        modo === "INDIVIDUAL" ? "Individual" : "Consolidado";
}

// ========================================
// PRÉ-VISUALIZAÇÃO
// ========================================

function atualizarPrevia() {
    const preview = document.getElementById("previewConteudo");
    if (!preview) return;

    const selecionados = obterSelecionados();
    const modo = obterModoEnvio();

    if (!selecionados.length) {
        preview.textContent = "Nenhum registro selecionado.";
        return;
    }

    let texto = "";

    texto += modo === "INDIVIDUAL"
        ? "ENVIO INDIVIDUAL AO PIPEFY\n"
        : "ENVIO CONSOLIDADO AO PIPEFY\n";

    texto += "========================================\n\n";

    selecionados.forEach((registro, indice) => {
        texto += `REGISTRO ${indice + 1}\n`;
        texto += `Setor: ${registro.setor}\n`;
        texto += `Suprimento: ${registro.suprimento}\n`;
        texto += `Cor: ${registro.cor || "—"}\n`;
        texto += `Quantidade: ${registro.un ?? "—"}\n`;
        texto += `Tipo: ${registro.tipo}\n`;
        texto += `Data: ${formatarData(registro.dataHora)}\n`;
        texto += "----------------------------------------\n";
    });

    texto += `\nTotal de registros: ${selecionados.length}`;

    if (modo === "INDIVIDUAL") {
        texto += `\nCards previstos: ${selecionados.length}`;
    } else {
        texto += "\nCards previstos: 1";
    }

    preview.textContent = texto;
}

// ========================================
// ENVIAR AO PIPEFY
// ========================================

async function enviarAoPipefy() {
    const selecionados = obterSelecionados();
    const modo = obterModoEnvio();

    if (!selecionados.length) {
        mostrarResultado(
            "Selecione pelo menos um registro antes de enviar.",
            "error"
        );
        return;
    }

    const quantidadeCards = modo === "INDIVIDUAL"
        ? selecionados.length
        : 1;

    const confirmacao = confirm(
        `Você selecionou ${selecionados.length} registro(s).\n\n` +
        `Modalidade: ${modo === "INDIVIDUAL" ? "Individual" : "Consolidado"}\n` +
        `Cards previstos: ${quantidadeCards}\n\n` +
        "Deseja continuar?"
    );

    if (!confirmacao) return;

    const botao = document.getElementById("btn-enviar-pipefy");

    if (botao?.disabled) return;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Enviando...";
    }

    try {
        const { data: sessaoData, error: sessaoErro } =
            await supabaseIntegrador.auth.getSession();

        const accessToken = sessaoData?.session?.access_token;

        if (sessaoErro || !accessToken) {
            throw new Error(
                "Sua sessão expirou. Entre novamente no sistema."
            );
        }

        const registros = selecionados.map(item => ({
            tipo: item.tipo,
            setor: item.setor,
            suprimento: item.suprimento,
            cor: item.cor || "",
            quantidade: Number(item.un),
            dataHora: item.dataHora || null
        }));

        const resposta = await fetch("/api/pipefy", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },

            body: JSON.stringify({
                modo,
                registros
            })
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                resultado.error ||
                `Falha na integração (HTTP ${resposta.status}).`
            );
        }

        const criados = resultado.criados || [];
        const falhas = resultado.falhas || [];

        let mensagem =
            `${criados.length} card(s) criado(s) no Pipefy.\n`;

        mensagem += `Modalidade: ${
            modo === "INDIVIDUAL" ? "Individual" : "Consolidado"
        }\n`;

        if (criados.length) {
            mensagem += "\nCards criados:\n";

            criados.forEach(card => {
                mensagem += `\n${card.title || "Card criado"}`;

                if (card.url) {
                    mensagem += `\n${card.url}`;
                }
            });
        }

        if (falhas.length) {
            mensagem += `\n\nFalhas: ${falhas.length}\n`;

            falhas.forEach(falha => {
                mensagem += `\n${falha.setor || "—"} — `;
                mensagem += `${falha.suprimento || "—"}: `;
                mensagem += `${falha.error || "Erro não identificado"}\n`;
            });
        }

        mostrarResultado(
            mensagem,
            falhas.length ? "error" : "success"
        );

    } catch (error) {
        console.error("Erro no envio ao Pipefy:", error);

        mostrarResultado(
            "Não foi possível concluir o envio: " + error.message,
            "error"
        );

    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Enviar ao Pipefy";
        }
    }
}

// ========================================
// RESULTADO DA INTEGRAÇÃO
// ========================================

function mostrarResultado(mensagem, tipo) {
    const elemento = document.getElementById("resultado-envio");

    if (!elemento) {
        alert(mensagem);
        return;
    }

    elemento.hidden = false;
    elemento.className = `send-result ${tipo}`;
    elemento.textContent = mensagem;
}

// ========================================
// CARREGAMENTO
// ========================================

function definirCarregamento(carregando) {
    const botoes = [
        document.getElementById("btn-search"),
        document.querySelector('button[onclick="gerarRegistros()"]'),
        document.querySelector('button[onclick="gerarReservas()"]')
    ];

    botoes.forEach(botao => {
        if (botao) botao.disabled = carregando;
    });
}

// ========================================
// LIMPAR CONSULTA
// ========================================

function limparTudo() {
    const input = document.getElementById("input-search");
    const preview = document.getElementById("previewConteudo");
    const tbody = document.getElementById("tabela-registros");
    const texto = document.getElementById("texto-registros");
    const resultado = document.getElementById("resultado-envio");

    if (input) input.value = "";

    if (preview) {
        preview.textContent = "Nenhum registro selecionado.";
    }

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Nenhum registro carregado.
                </td>
            </tr>
        `;
    }

    if (texto) {
        texto.textContent =
            "Consulte o histórico ou pesquise uma impressora.";
    }

    if (resultado) {
        resultado.hidden = true;
        resultado.textContent = "";
    }

    dadosGerados = [];
    registrosSelecionados.clear();
    relatorioAtual = "";

    document.getElementById("contador-registros").textContent = "0";
    document.getElementById("selecionar-todos").checked = false;

    atualizarResumo();
}

// ========================================
// EVENTOS
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    const btnSair = document.getElementById("btn-sair");

    if (btnSair) {
        btnSair.addEventListener("click", sair);
    }

    carregarPerfilUsuario();

    const btnSearch = document.getElementById("btn-search");
    const inputSearch = document.getElementById("input-search");

    btnSearch.addEventListener("click", async () => {
        const termo = inputSearch.value.trim();

        if (!termo) {
            mostrarResultado(
                "Digite o nome da impressora, setor ou suprimento.",
                "error"
            );
            return;
        }

        relatorioAtual = "FILTRO";
        definirCarregamento(true);

        const resultado = await buscarDados(termo);

        definirCarregamento(false);

        if (resultado) {
            carregarRegistros(resultado, `Pesquisa: ${termo}`);
        }
    });

    inputSearch.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            btnSearch.click();
        }
    });

    document.getElementById("selecionar-todos")
        .addEventListener("change", event => {
            selecionarTodos(event.target.checked);
        });

    document.getElementById("btn-limpar-selecao")
        .addEventListener("click", limparSelecao);

    document.querySelectorAll('input[name="modo-envio"]')
        .forEach(radio => {
            radio.addEventListener("change", () => {
                atualizarResumo();
                atualizarPrevia();
            });
        });

    atualizarResumo();
    atualizarPrevia();
});

// ========================================
// FUNÇÕES DISPONÍVEIS NO HTML
// ========================================

window.gerarReservas = gerarEstoque;
window.gerarRegistros = gerarRegistros;
window.enviarAoPipefy = enviarAoPipefy;
window.limparTudo = limparTudo;