
(() => {
  'use strict';

  const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);

  const ETAPAS = [
    { id: 'solicitacao_aberta', nome: 'Aberta' },
    { id: 'em_triagem', nome: 'Triagem' },
    { id: 'aguardando_peca', nome: 'Aguardando peça' },
    { id: 'aguardando_aprovacao', nome: 'Aguardando aprovação' },
    { id: 'em_manutencao', nome: 'Em manutenção' },
    { id: 'em_testes', nome: 'Em testes' },
    { id: 'concluida', nome: 'Concluída' },
    { id: 'entregue', nome: 'Entregue' },
    { id: 'cancelada', nome: 'Cancelada' }
  ];

  const PRIORIDADES = ['baixa', 'media', 'alta', 'critica'];

  let ativos = [];
  let manutencoes = [];
  let usuario = null;

  const normalizar = valor => String(valor ?? '').trim();

  const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  })[c]);

  const dataLocal = valor => {
    if (!valor) return '';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    return new Date(data.getTime() - data.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
  };

  const dataFormatada = valor => {
    if (!valor) return '—';
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
      ? '—'
      : data.toLocaleString('pt-BR');
  };

  function mensagem(texto, erro = false) {
    let el = $('manutencao-feedback');

    if (!el) {
      el = document.createElement('div');
      el.id = 'manutencao-feedback';
      el.setAttribute('role', 'status');
      document.querySelector('.modulo-ti-main')
        .insertBefore(el, document.querySelector('.modulo-ti-footer'));
    }

    el.textContent = texto;
    el.className = erro ? 'erro' : 'sucesso';
  }

  function montarInterface() {
    const main = document.querySelector('.modulo-ti-main');
    const grid = main.querySelector('.modulo-ti-grid');
    const notice = main.querySelector('.modulo-ti-notice');

    if (grid) grid.remove();
    if (notice) notice.remove();

    const area = document.createElement('section');
    area.id = 'manutencao-app';

    area.innerHTML = `
      <section class="manutencao-indicadores">
        <article class="modulo-ti-card">
          <span>Solicitações totais</span>
          <strong id="kpi-total">0</strong>
        </article>
        <article class="modulo-ti-card">
          <span>Em andamento</span>
          <strong id="kpi-andamento">0</strong>
        </article>
        <article class="modulo-ti-card">
          <span>Aguardando</span>
          <strong id="kpi-aguardando">0</strong>
        </article>
        <article class="modulo-ti-card">
          <span>Concluídas</span>
          <strong id="kpi-concluidas">0</strong>
        </article>
      </section>

      <section class="manutencao-toolbar">
        <div>
          <h2>Central de manutenção</h2>
          <p>Gerencie solicitações e acompanhe o fluxo técnico.</p>
        </div>
        <div>
          <button type="button" id="btn-atualizar-manutencoes">Atualizar</button>
          <button type="button" id="btn-nova-manutencao">+ Nova solicitação</button>
        </div>
      </section>

      <section class="manutencao-filtros">
        <input id="filtro-manutencao" type="search"
          placeholder="Buscar protocolo, ativo, solicitante ou série">
        <select id="filtro-status">
          <option value="">Todas as etapas</option>
          ${ETAPAS.map(e => `<option value="${e.id}">${e.nome}</option>`).join('')}
        </select>
        <select id="filtro-prioridade">
          <option value="">Todas as prioridades</option>
          ${PRIORIDADES.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </section>

      <div id="manutencao-feedback" role="status"></div>

      <section id="manutencao-kanban" class="manutencao-kanban"></section>

      <div id="modal-manutencao" class="manutencao-modal" hidden>
        <div class="manutencao-modal-conteudo">
          <header>
            <div>
              <span class="eyebrow">GESTÃO DE TI</span>
              <h2 id="modal-manutencao-titulo">Nova solicitação</h2>
            </div>
            <button type="button" id="fechar-modal-manutencao"
              aria-label="Fechar">×</button>
          </header>

          <form id="form-manutencao">
            <input type="hidden" id="manutencao-id">

            <div class="manutencao-form-grid">
              <div>
                <label for="manutencao-ativo">Ativo relacionado *</label>
                <select id="manutencao-ativo" required>
                  <option value="">Selecione um ativo</option>
                </select>
              </div>
              <div>
                <label for="manutencao-prioridade">Prioridade *</label>
                <select id="manutencao-prioridade" required>
                  <option value="baixa">Baixa</option>
                  <option value="media" selected>Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
            </div>

            <label for="solicitante-nome">Nome do solicitante *</label>
            <input id="solicitante-nome" maxlength="160" required>

            <div class="manutencao-form-grid">
              <div>
                <label for="solicitante-email">E-mail *</label>
                <input id="solicitante-email" type="email" maxlength="160" required>
              </div>
              <div>
                <label for="solicitante-telefone">Telefone</label>
                <input id="solicitante-telefone" maxlength="40">
              </div>
            </div>

            <label for="solicitante-setor">Setor</label>
            <input id="solicitante-setor" maxlength="120">

            <label for="descricao-problema">Descrição do problema *</label>
            <textarea id="descricao-problema" rows="4" required></textarea>

            <div class="manutencao-modal-acoes">
              <button type="button" id="cancelar-manutencao">Cancelar</button>
              <button type="submit" id="salvar-manutencao">Registrar solicitação</button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-detalhes-manutencao" class="manutencao-modal" hidden>
        <div class="manutencao-modal-conteudo manutencao-detalhes">
          <header>
            <div>
              <span class="eyebrow">ATENDIMENTO TÉCNICO</span>
              <h2>Detalhes da manutenção</h2>
            </div>
            <button type="button" id="fechar-detalhes-manutencao">×</button>
          </header>
          <div id="detalhes-manutencao-conteudo"></div>
        </div>
      </div>
    `;

    main.insertBefore(area, main.querySelector('.modulo-ti-footer'));

    $('btn-nova-manutencao').addEventListener('click', abrirFormulario);
    $('btn-atualizar-manutencoes').addEventListener('click', carregarDados);
    $('fechar-modal-manutencao').addEventListener('click', fecharFormulario);
    $('cancelar-manutencao').addEventListener('click', fecharFormulario);
    $('fechar-detalhes-manutencao').addEventListener('click', fecharDetalhes);
    $('form-manutencao').addEventListener('submit', salvarSolicitacao);

    $('filtro-manutencao').addEventListener('input', renderizarKanban);
    $('filtro-status').addEventListener('change', renderizarKanban);
    $('filtro-prioridade').addEventListener('change', renderizarKanban);

    $('modal-manutencao').addEventListener('click', e => {
      if (e.target === $('modal-manutencao')) fecharFormulario();
    });

    $('modal-detalhes-manutencao').addEventListener('click', e => {
      if (e.target === $('modal-detalhes-manutencao')) fecharDetalhes();
    });
  }

  async function carregarUsuario() {
    const { data, error } = await db.auth.getUser();
    if (error) throw error;
    usuario = data.user;
  }

  async function carregarAtivos() {
    const { data, error } = await db
      .from('ativos')
      .select('id, descricao, categoria, fabricante, modelo, numero_serie')
      .order('descricao');

    if (error) throw error;

    ativos = data || [];

    $('manutencao-ativo').innerHTML =
      '<option value="">Selecione um ativo</option>' +
      ativos.map(a => `
        <option value="${a.id}">
          ${escapar(a.descricao)} — ${escapar(a.numero_serie || 'Sem série')}
        </option>
      `).join('');
  }

  async function carregarDados() {
    $('btn-atualizar-manutencoes').disabled = true;

    try {
      const { data, error } = await db
        .from('manutencoes')
        .select('*')
        .order('data_abertura', { ascending: false });

      if (error) throw error;

      manutencoes = data || [];
      atualizarIndicadores();
      renderizarKanban();
      mensagem('Manutenções atualizadas.');

    } catch (error) {
      console.error(error);
      mensagem(`Erro ao carregar manutenções: ${error.message}`, true);
    } finally {
      $('btn-atualizar-manutencoes').disabled = false;
    }
  }

  function atualizarIndicadores() {
    $('kpi-total').textContent = manutencoes.length;

    $('kpi-andamento').textContent = manutencoes.filter(m =>
      ['em_triagem', 'em_manutencao', 'em_testes'].includes(m.status)
    ).length;

    $('kpi-aguardando').textContent = manutencoes.filter(m =>
      ['aguardando_peca', 'aguardando_aprovacao'].includes(m.status)
    ).length;

    $('kpi-concluidas').textContent = manutencoes.filter(m =>
      ['concluida', 'entregue'].includes(m.status)
    ).length;
  }

  function nomeEtapa(status) {
    return ETAPAS.find(e => e.id === status)?.nome || status || 'Aberta';
  }

  function ativoDaManutencao(item) {
    return ativos.find(a => String(a.id) === String(item.ativo_id));
  }

  function renderizarKanban() {
    const termo = normalizar($('filtro-manutencao').value).toLowerCase();
    const statusFiltro = $('filtro-status').value;
    const prioridadeFiltro = $('filtro-prioridade').value;

    const lista = manutencoes.filter(item => {
      const ativo = ativoDaManutencao(item);

      const texto = [
        item.protocolo, item.equipamento_descricao,
        item.solicitante_nome, item.descricao_problema,
        ativo?.numero_serie
      ].join(' ').toLowerCase();

      return (!termo || texto.includes(termo)) &&
        (!statusFiltro || item.status === statusFiltro) &&
        (!prioridadeFiltro || item.prioridade === prioridadeFiltro);
    });

    const kanban = $('manutencao-kanban');
    kanban.replaceChildren();

    ETAPAS.forEach(etapa => {
      const itens = lista.filter(m => (m.status || 'solicitacao_aberta') === etapa.id);

      const coluna = document.createElement('section');
      coluna.className = `kanban-coluna etapa-${etapa.id}`;

      const titulo = document.createElement('header');
      titulo.className = 'kanban-coluna-header';
      titulo.innerHTML = `
        <h3>${etapa.nome}</h3>
        <span>${itens.length}</span>
      `;

      const corpo = document.createElement('div');
      corpo.className = 'kanban-coluna-corpo';

      if (!itens.length) {
        corpo.innerHTML = '<p class="kanban-vazio">Nenhuma solicitação</p>';
      }

      itens.forEach(item => corpo.appendChild(criarCartao(item)));

      coluna.append(titulo, corpo);
      kanban.appendChild(coluna);
    });
  }

  function criarCartao(item) {
    const card = document.createElement('article');
    card.className = 'kanban-card';

    const ativo = ativoDaManutencao(item);
    const equipamento = item.equipamento_descricao ||
      ativo?.descricao || 'Equipamento não identificado';

    card.innerHTML = `
      <div class="kanban-card-topo">
        <span>${escapar(item.protocolo || 'Sem protocolo')}</span>
        <span class="prioridade prioridade-${escapar(item.prioridade)}">
          ${escapar(item.prioridade || 'Média')}
        </span>
      </div>
      <h4>${escapar(equipamento)}</h4>
      <p>${escapar(item.descricao_problema || 'Sem descrição')}</p>
      <div class="kanban-card-meta">
        <span>${escapar(item.solicitante_nome || 'Solicitante não informado')}</span>
        <span>${dataFormatada(item.data_abertura)}</span>
      </div>
      <div class="kanban-card-acoes">
        <button type="button" data-acao="detalhes">Detalhes</button>
        <button type="button" data-acao="avancar">Alterar etapa</button>
      </div>
      <div class="kanban-card-acoes kanban-card-acompanhamento">
        <button
          type="button"
          data-acao="compartilhar-acompanhamento"
          ${item.token_acompanhamento ? '' : 'disabled'}
          title="${item.token_acompanhamento ? 'Compartilhar link privado' : 'Esta solicitação não possui token de acompanhamento'}"
        >Compartilhar</button>
        <button
          type="button"
          data-acao="copiar-acompanhamento"
          ${item.token_acompanhamento ? '' : 'disabled'}
          title="${item.token_acompanhamento ? 'Copiar link privado' : 'Esta solicitação não possui token de acompanhamento'}"
        >Copiar link</button>
      </div>
    `;

    card.querySelector('[data-acao="detalhes"]')
      .addEventListener('click', () => abrirDetalhes(item));

    card.querySelector('[data-acao="avancar"]')
      .addEventListener('click', () => alterarEtapa(item));

    card.querySelector('[data-acao="compartilhar-acompanhamento"]')
      .addEventListener('click', () => compartilharAcompanhamento(item));

    card.querySelector('[data-acao="copiar-acompanhamento"]')
      .addEventListener('click', () => copiarLinkAcompanhamento(item));

    return card;
  }

    function gerarLinkAcompanhamento(item) {
      const token = normalizar(item?.token_acompanhamento);

      if (!token) {
        throw new Error('Esta solicitação não possui token de acompanhamento.');
      }

      const link = new URL(
        '/Pages/acompanhamento-publico.html',
        window.location.origin
      );

      link.searchParams.set('token', token);

      return link.toString();
    }
    
  async function copiarTexto(texto) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return;
    }

    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();

    const copiado = document.execCommand('copy');
    campo.remove();

    if (!copiado) {
      window.prompt('Copie o link de acompanhamento:', texto);
    }
  }

  async function copiarLinkAcompanhamento(item) {
    try {
      const link = gerarLinkAcompanhamento(item);
      await copiarTexto(link);
      mensagem('Link privado de acompanhamento copiado.');
    } catch (error) {
      console.error('Erro ao copiar link de acompanhamento:', error);
      mensagem(error.message || 'Não foi possível copiar o link.', true);
    }
  }

  async function compartilharAcompanhamento(item) {
    try {
      const link = gerarLinkAcompanhamento(item);
      const dados = {
        title: `Acompanhamento ${item.protocolo || 'da manutenção'}`,
        text: `Acompanhe sua solicitação de manutenção ${item.protocolo || ''}.`,
        url: link
      };

      if (navigator.share) {
        await navigator.share(dados);
        mensagem('Link de acompanhamento pronto para compartilhar.');
      } else {
        await copiarTexto(link);
        mensagem('Seu navegador não oferece compartilhamento direto. Link copiado.');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Erro ao compartilhar acompanhamento:', error);
      mensagem(error.message || 'Não foi possível compartilhar o acompanhamento.', true);
    }
  }

  function abrirFormulario() {
    $('form-manutencao').reset();
    $('manutencao-id').value = '';
    $('modal-manutencao-titulo').textContent = 'Nova solicitação';
    $('salvar-manutencao').textContent = 'Registrar solicitação';
    $('modal-manutencao').hidden = false;
  }

  function fecharFormulario() {
    $('modal-manutencao').hidden = true;
  }

  async function salvarSolicitacao(event) {
    event.preventDefault();

    const ativo = ativos.find(a =>
      String(a.id) === $('manutencao-ativo').value
    );

    if (!ativo) {
      mensagem('Selecione um ativo válido do inventário.', true);
      return;
    }

    const nome = normalizar($('solicitante-nome').value);
    const email = normalizar($('solicitante-email').value);
    const descricao = normalizar($('descricao-problema').value);

    if (!nome || !email || !descricao) {
      mensagem('Preencha o nome, o e-mail e a descrição do problema.', true);
      return;
    }

    // Valida também o formato do e-mail, conforme o tipo do campo HTML.
    if (!$('solicitante-email').checkValidity()) {
      $('solicitante-email').reportValidity();
      return;
    }

    const payload = {
      protocolo: gerarProtocolo(),
      token_acompanhamento: gerarToken(),
      ativo_id: ativo.id,
      equipamento_descricao: ativo.descricao,
      categoria: ativo.categoria || null,
      fabricante: ativo.fabricante || null,
      modelo: ativo.modelo || null,
      numero_serie: ativo.numero_serie || null,
      solicitante_nome: nome,
      solicitante_email: email,
      solicitante_setor: normalizar($('solicitante-setor').value) || null,
      solicitante_telefone: normalizar($('solicitante-telefone').value) || null,
      descricao_problema: descricao,
      prioridade: $('manutencao-prioridade').value,
      status: 'solicitacao_aberta'
    };

    const botao = $('salvar-manutencao');
    botao.disabled = true;
    botao.textContent = 'Registrando...';

    try {
      const { data, error } = await db
        .from('manutencoes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await registrarHistorico({
        manutencao_id: data.id,
        status_anterior: null,
        status_novo: 'solicitacao_aberta',
        descricao: 'Solicitação de manutenção registrada.',
        usuario_id: usuario?.id || null,
        responsavel_nome: usuario?.email || 'Sistema',
        visivel_solicitante: true
      });

      fecharFormulario();
      mensagem(`Solicitação ${data.protocolo} registrada com sucesso.`);

      const link = new URL('/Pages/acompanhamento.html', location.origin);
      link.searchParams.set('token', data.token_acompanhamento);

      try {
        await navigator.clipboard.writeText(link.toString());
        mensagem('Solicitação registrada. Link privado de acompanhamento copiado.');
      } catch {
        window.prompt('Copie o link privado de acompanhamento:', link.toString());
      }

      await carregarDados();

    } catch (error) {
      console.error('Erro ao registrar manutenção:', error);
      const detalhe = [
        error.message,
        error.code ? `Código: ${error.code}` : '',
        error.details ? `Detalhes: ${error.details}` : '',
        error.hint ? `Orientação: ${error.hint}` : ''
      ].filter(Boolean).join(' | ');
      mensagem(`Não foi possível registrar: ${detalhe || 'Erro desconhecido.'}`, true);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Registrar solicitação';
    }
  }

  function gerarProtocolo() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const identificador = crypto.randomUUID()
      .replace(/-/g, '')
      .substring(0, 8)
      .toUpperCase();

    return `MAN-${ano}${mes}${dia}-${identificador}`;
  }

  function gerarToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function registrarHistorico(payload) {
    const { error } = await db
      .from('historico_manutencoes')
      .insert(payload);

    if (error) {
      console.error('Falha ao registrar histórico:', error);
      mensagem(`Manutenção salva, mas o histórico falhou: ${error.message}`, true);
    }
  }

  async function alterarEtapa(item) {
    const atual = ETAPAS.findIndex(e => e.id === item.status);
    const opcoes = ETAPAS.map(e => e.nome).join('\n');

    const escolha = window.prompt(
      `Etapa atual: ${nomeEtapa(item.status)}\n\n` +
      `Informe a nova etapa pelo nome:\n${opcoes}`
    );

    if (!escolha) return;

    const novaEtapa = ETAPAS.find(e =>
      e.nome.toLowerCase() === escolha.trim().toLowerCase()
    );

    if (!novaEtapa) {
      mensagem('Etapa inválida.', true);
      return;
    }

    if (novaEtapa.id === item.status) return;

    const agora = new Date().toISOString();

    const payload = {
      status: novaEtapa.id,
      atualizado_em: agora
    };

    if (novaEtapa.id === 'concluida') {
      payload.data_conclusao = agora;
    } else {
      payload.data_conclusao = null;
    }

    const { error } = await db
      .from('manutencoes')
      .update(payload)
      .eq('id', item.id);

    if (error) {
      mensagem(`Erro ao alterar etapa: ${error.message}`, true);
      return;
    }

    await registrarHistorico({
      manutencao_id: item.id,
      status_anterior: item.status,
      status_novo: novaEtapa.id,
      descricao: `Etapa alterada de ${nomeEtapa(item.status)} para ${novaEtapa.nome}.`,
      usuario_id: usuario?.id || null,
      responsavel_nome: usuario?.email || 'Equipe técnica',
      visivel_solicitante: true
    });

    mensagem('Etapa atualizada.');
    await carregarDados();
  }

  async function abrirDetalhes(item) {
    const ativo = ativoDaManutencao(item);

    const { data: historico, error } = await db
      .from('historico_manutencoes')
      .select('*')
      .eq('manutencao_id', item.id)
      .order('criado_em', { ascending: false });

    if (error) {
      mensagem(`Erro ao carregar histórico: ${error.message}`, true);
      return;
    }

    $('detalhes-manutencao-conteudo').innerHTML = `
      <h3>${escapar(item.protocolo || 'Solicitação')}</h3>
      <p><strong>Equipamento:</strong> ${escapar(item.equipamento_descricao || ativo?.descricao)}</p>
      <p><strong>Solicitante:</strong> ${escapar(item.solicitante_nome)}</p>
      <p><strong>Setor:</strong> ${escapar(item.solicitante_setor || '—')}</p>
      <p><strong>Prioridade:</strong> ${escapar(item.prioridade)}</p>
      <p><strong>Status:</strong> ${escapar(nomeEtapa(item.status))}</p>
      <p><strong>Problema:</strong> ${escapar(item.descricao_problema)}</p>
      <p><strong>Diagnóstico:</strong> ${escapar(item.diagnostico || 'Não informado')}</p>
      <p><strong>Solução aplicada:</strong> ${escapar(item.solucao_aplicada || 'Não informada')}</p>
      <p><strong>Técnico responsável:</strong> ${escapar(item.tecnico_responsavel || 'Não atribuído')}</p>
      <p><strong>Previsão:</strong> ${dataFormatada(item.previsao_conclusao)}</p>
      <p><strong>Conclusão:</strong> ${dataFormatada(item.data_conclusao)}</p>
      <p><strong>Entrega:</strong> ${dataFormatada(item.data_entrega)}</p>
      <hr>
      <h3>Histórico técnico</h3>
      <div class="historico-manutencao">
        ${(historico || []).map(h => `
          <article>
            <strong>${escapar(nomeEtapa(h.status_novo || 'Atualização'))}</strong>
            <p>${escapar(h.descricao || '')}</p>
            <small>${dataFormatada(h.criado_em)} · ${escapar(h.responsavel_nome || 'Sistema')}</small>
          </article>
        `).join('') || '<p>Nenhuma atualização registrada.</p>'}
      </div>
      <button type="button" id="btn-editar-diagnostico">Registrar diagnóstico e solução</button>
    `;

    $('btn-editar-diagnostico').addEventListener('click', () => editarDiagnostico(item));
    $('modal-detalhes-manutencao').hidden = false;
  }

  function fecharDetalhes() {
    $('modal-detalhes-manutencao').hidden = true;
  }

  async function editarDiagnostico(item) {
    const diagnostico = window.prompt('Informe o diagnóstico:', item.diagnostico || '');
    if (diagnostico === null) return;

    const solucao = window.prompt('Informe a solução aplicada:', item.solucao_aplicada || '');
    if (solucao === null) return;

    const tecnico = window.prompt(
      'Nome do técnico responsável:',
      item.tecnico_responsavel || ''
    );

    const payload = {
      diagnostico: normalizar(diagnostico) || null,
      solucao_aplicada: normalizar(solucao) || null,
      atualizado_em: new Date().toISOString()
    };

    // tecnico_responsavel é UUID no banco. Não gravar nome nesse campo.
    // O nome do técnico fica no histórico até existir uma tela de seleção de usuário.
    const { error } = await db
      .from('manutencoes')
      .update(payload)
      .eq('id', item.id);

    if (error) {
      mensagem(`Erro ao atualizar diagnóstico: ${error.message}`, true);
      return;
    }

    await registrarHistorico({
      manutencao_id: item.id,
      status_anterior: item.status,
      status_novo: item.status,
      descricao: `Diagnóstico: ${diagnostico}\nSolução: ${solucao}`,
      usuario_id: usuario?.id || null,
      responsavel_nome: normalizar(tecnico) || usuario?.email || 'Equipe técnica',
      visivel_solicitante: true
    });

    fecharDetalhes();
    mensagem('Diagnóstico e solução atualizados.');
    await carregarDados();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    montarInterface();

    try {
      await carregarUsuario();
      await carregarAtivos();
      await carregarDados();
    } catch (error) {
      console.error(error);
      mensagem(`Falha na inicialização: ${error.message}`, true);
    }
  });
})();