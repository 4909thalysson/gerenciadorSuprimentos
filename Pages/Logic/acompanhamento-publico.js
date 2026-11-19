
(() => {
  'use strict';

  const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const $ = id => document.getElementById(id);

  const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[c]);

  const ETAPAS = {
    aberta: 'Aberta',
    triagem: 'Triagem',
    aguardando: 'Aguardando',
    em_manutencao: 'Em manutenção',
    em_testes: 'Em testes',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
  };

  const formatarData = valor => {
    if (!valor) return '—';
    const data = new Date(valor);

    return Number.isNaN(data.getTime())
      ? '—'
      : data.toLocaleString('pt-BR');
  };

  function mostrarFeedback(texto, erro = false) {
    let elemento = $('acompanhamento-feedback');

    if (!elemento) {
      elemento = document.createElement('div');
      elemento.id = 'acompanhamento-feedback';
      elemento.setAttribute('role', 'status');
      document.querySelector('.modulo-ti-lookup').appendChild(elemento);
    }

    elemento.textContent = texto;
    elemento.className = erro ? 'erro' : 'sucesso';
  }

  function montarResultado(item) {
    let resultado = $('resultado-acompanhamento');

    if (!resultado) {
      resultado = document.createElement('section');
      resultado.id = 'resultado-acompanhamento';
      resultado.className = 'resultado-acompanhamento';

      document.querySelector('.modulo-ti-main')
        .insertBefore(resultado, document.querySelector('.modulo-ti-footer'));
    }

    const historico = Array.isArray(item.historico)
      ? item.historico
      : [];

    const status = ETAPAS[item.status] || item.status || 'Não informado';

    resultado.innerHTML = `
      <article class="acompanhamento-detalhes">
        <header>
          <span class="eyebrow">ACOMPANHAMENTO DE SERVIÇO</span>
          <h2>Protocolo ${escapar(item.protocolo || 'Não informado')}</h2>
          <span class="acompanhamento-status">${escapar(status)}</span>
        </header>

        <section>
          <h3>Equipamento</h3>
          <div class="acompanhamento-informacoes">
            <p><strong>Descrição:</strong> ${escapar(item.equipamento_descricao)}</p>
            <p><strong>Categoria:</strong> ${escapar(item.categoria)}</p>
            <p><strong>Fabricante:</strong> ${escapar(item.fabricante)}</p>
            <p><strong>Modelo:</strong> ${escapar(item.modelo)}</p>
            <p><strong>Número de série:</strong> ${escapar(item.numero_serie)}</p>
          </div>
        </section>

        <section>
          <h3>Solicitação</h3>
          <div class="acompanhamento-informacoes">
            <p><strong>Solicitante:</strong> ${escapar(item.solicitante_nome)}</p>
            <p><strong>Setor:</strong> ${escapar(item.solicitante_setor)}</p>
            <p><strong>Prioridade:</strong> ${escapar(item.prioridade)}</p>
            <p><strong>Abertura:</strong> ${formatarData(item.data_abertura)}</p>
            <p><strong>Previsão:</strong> ${formatarData(item.previsao_conclusao)}</p>
            <p><strong>Conclusão:</strong> ${formatarData(item.data_conclusao)}</p>
            <p><strong>Entrega:</strong> ${formatarData(item.data_entrega)}</p>
          </div>
          <h4>Problema informado</h4>
          <p>${escapar(item.descricao_problema)}</p>
        </section>

        <section>
          <h3>Atualizações do atendimento</h3>
          <div class="acompanhamento-historico">
            ${
              historico.length
                ? historico.map(registro => `
                  <article class="acompanhamento-evento">
                    <strong>
                      ${escapar(
                        ETAPAS[registro.status_novo] ||
                        registro.status_novo ||
                        'Atualização'
                      )}
                    </strong>
                    <p>${escapar(registro.descricao || '')}</p>
                    <small>
                      ${formatarData(registro.criado_em)}
                      ${registro.responsavel_nome
                        ? ` · ${escapar(registro.responsavel_nome)}`
                        : ''}
                    </small>
                  </article>
                `).join('')
                : '<p>Nenhuma atualização pública registrada.</p>'
            }
          </div>
        </section>

        <p class="acompanhamento-atualizacao">
          Última atualização: ${formatarData(item.atualizado_em)}
        </p>
      </article>
    `;

    resultado.hidden = false;
  }

  async function consultar(token) {
    const codigo = String(token || '').trim();
    const botao = $('btn-consultar-token');

    if (!codigo) {
      mostrarFeedback('Informe o código de acompanhamento.', true);
      return;
    }

    if (codigo.length < 32) {
      mostrarFeedback('O código informado não parece ser válido.', true);
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Consultando...';

    const resultado = $('resultado-acompanhamento');
    if (resultado) resultado.hidden = true;

    try {
      const { data, error } = await db.rpc(
        'consultar_acompanhamento_manutencao',
        { p_token: codigo }
      );

      if (error) throw error;

      const item = Array.isArray(data) ? data[0] : data;

      if (!item) {
        mostrarFeedback(
          'Nenhuma manutenção encontrada para o código informado.',
          true
        );
        return;
      }

      montarResultado(item);
      mostrarFeedback('Acompanhamento carregado com sucesso.');

    } catch (error) {
      console.error('Erro ao consultar manutenção:', error);

      mostrarFeedback(
        'Não foi possível consultar a manutenção. Verifique o código ou tente novamente.',
        true
      );

    } finally {
      botao.disabled = false;
      botao.textContent = 'Consultar';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = $('token-acompanhamento');
    const botao = $('btn-consultar-token');

    if (!input || !botao) {
      console.error('Elementos do acompanhamento não encontrados no HTML.');
      return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get('token');

    input.addEventListener('input', () => {
      botao.disabled = !input.value.trim();
    });

    botao.addEventListener('click', () => consultar(input.value));

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        consultar(input.value);
      }
    });

    if (token) {
      input.value = token;
      consultar(token);
    }
  });
})();