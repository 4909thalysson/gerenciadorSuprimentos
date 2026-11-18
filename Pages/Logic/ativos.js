(() => {
  'use strict';

  const SUPABASE_URL = 'https://kxiapqtfwdwiqnvqjtkf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const $ = id => document.getElementById(id);
  const campos = ['descricao','categoria','fabricante','modelo','numero_serie','responsavel_uso','data_aquisicao','ram_gb','tipo_ram','armazenamento_gb','tipo_armazenamento'];
  let ativos = [];
  let ativosFiltrados = [];

  const normalizar = value => String(value ?? '').trim();
  const formatarData = value => {
    if (!value) return '—';
    const data = new Date(`${value}T00:00:00`);
    return Number.isNaN(data.getTime()) ? value : data.toLocaleDateString('pt-BR');
  };
  const texto = (element, value) => { element.textContent = value ?? ''; };
  const feedback = (mensagem, erro = false) => {
    const el = $('ativos-feedback');
    texto(el, mensagem);
    el.classList.toggle('erro', erro);
  };
  const criarCelula = (row, value, className = '') => {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value || '—';
    row.appendChild(cell);
    return cell;
  };

  function atualizarIndicadores(lista) {
    const contar = categoria => lista.filter(item => normalizar(item.categoria).toLowerCase() === categoria.toLowerCase()).length;
    texto($('kpi-total'), lista.length);
    texto($('kpi-notebook'), contar('Notebook'));
    texto($('kpi-moveis'), contar('Celular') + contar('Tablet'));
    texto($('kpi-pc'), contar('PC'));
  }

  function criarAcoes(id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'acoes-linha';
    const editar = document.createElement('button');
    editar.type = 'button'; editar.className = 'acao-btn'; editar.textContent = 'Editar';
    editar.addEventListener('click', () => abrirModal(ativos.find(item => String(item.id) === String(id))));
    const excluir = document.createElement('button');
    excluir.type = 'button'; excluir.className = 'acao-btn excluir'; excluir.textContent = 'Excluir';
    excluir.addEventListener('click', () => excluirAtivo(id));
    wrapper.append(editar, excluir);
    return wrapper;
  }

  function renderizarTabela(lista) {
    const tbody = $('ativos-tbody');
    const mobile = $('ativos-mobile-list');
    tbody.replaceChildren();
    mobile.replaceChildren();
    texto($('resultado-contagem'), `${lista.length} ${lista.length === 1 ? 'ativo encontrado' : 'ativos encontrados'}`);

    if (!lista.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7; cell.className = 'estado-tabela'; cell.textContent = 'Nenhum ativo encontrado para os filtros selecionados.';
      row.appendChild(cell); tbody.appendChild(row);
      return;
    }

    lista.forEach(item => {
      const row = document.createElement('tr');
      const nome = document.createElement('td');
      const nomePrincipal = document.createElement('span'); nomePrincipal.className = 'ativo-nome'; nomePrincipal.textContent = item.descricao || 'Ativo sem descrição';
      const nomeSecundario = document.createElement('span'); nomeSecundario.className = 'ativo-sub'; nomeSecundario.textContent = item.modelo || 'Modelo não informado';
      nome.append(nomePrincipal, nomeSecundario); row.appendChild(nome);
      const categoria = criarCelula(row, item.categoria || '—');
      const pill = document.createElement('span'); pill.className = 'categoria-pill'; pill.textContent = item.categoria || 'Sem categoria'; categoria.replaceChildren(pill);
      criarCelula(row, [item.fabricante, item.modelo].filter(Boolean).join(' / '));
      criarCelula(row, item.numero_serie);
      criarCelula(row, item.responsavel_uso);
      criarCelula(row, formatarData(item.data_aquisicao));
      const acoes = document.createElement('td'); acoes.appendChild(criarAcoes(item.id)); row.appendChild(acoes);
      tbody.appendChild(row);

      const card = document.createElement('article'); card.className = 'ativo-mobile-card';
      const top = document.createElement('div'); top.className = 'ativo-mobile-top';
      const title = document.createElement('strong'); title.className = 'ativo-nome'; title.textContent = item.descricao || 'Ativo sem descrição';
      const tag = document.createElement('span'); tag.className = 'categoria-pill'; tag.textContent = item.categoria || 'Sem categoria';
      top.append(title, tag);
      const meta = document.createElement('div'); meta.className = 'ativo-mobile-meta';
      meta.textContent = `Fabricante/modelo: ${[item.fabricante,item.modelo].filter(Boolean).join(' / ') || '—'}\nSérie: ${item.numero_serie || '—'}\nResponsável: ${item.responsavel_uso || '—'}\nAquisição: ${formatarData(item.data_aquisicao)}`;
      card.append(top, meta, criarAcoes(item.id)); mobile.appendChild(card);
    });
  }

  function preencherFiltroFabricante() {
    const select = $('filtro-fabricante');
    const atual = select.value;
    const fabricantes = [...new Set(ativos.map(item => normalizar(item.fabricante)).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
    select.replaceChildren(new Option('Todos', ''));
    fabricantes.forEach(nome => select.addChild ? select.addChild(new Option(nome,nome)) : select.appendChild(new Option(nome,nome)));
    select.value = fabricantes.includes(atual) ? atual : '';
  }

  function aplicarFiltros() {
    const busca = normalizar($('filtro-busca').value).toLocaleLowerCase('pt-BR');
    const categoria = $('filtro-categoria').value;
    const fabricante = $('filtro-fabricante').value;
    ativosFiltrados = ativos.filter(item => {
      const correspondeBusca = !busca || [item.descricao,item.categoria,item.fabricante,item.modelo,item.numero_serie,item.responsavel_uso].some(valor => normalizar(valor).toLocaleLowerCase('pt-BR').includes(busca));
      return correspondeBusca && (!categoria || item.categoria === categoria) && (!fabricante || item.fabricante === fabricante);
    });
    renderizarTabela(ativosFiltrados);
  }

  async function carregarAtivos() {
    texto($('resultado-contagem'), 'Carregando inventário...');
    $('btn-atualizar').disabled = true;
    const { data, error } = await db.from('ativos').select('*').order('descricao', { ascending: true });
    $('btn-atualizar').disabled = false;
    if (error) {
      console.error('Erro ao carregar ativos:', error);
      ativos = [];
      atualizarIndicadores(ativos);
      renderizarTabela([]);
      feedback(`Não foi possível carregar a tabela ativos: ${error.message}`, true);
      return;
    }
    ativos = data || [];
    atualizarIndicadores(ativos);
    preencherFiltroFabricante();
    aplicarFiltros();
    feedback('Inventário atualizado.');
  }

  function abrirModal(item = null) {
    $('form-ativo').reset();
    $('ativo-id').value = item?.id ?? '';
    campos.forEach(campo => { $(campo).value = item?.[campo] ?? ''; });
    texto($('modal-titulo'), item ? 'Editar ativo' : 'Cadastrar ativo');
    texto($('btn-salvar-ativo'), item ? 'Salvar alterações' : 'Salvar ativo');
    $('modal-ativo').classList.add('aberto');
    $('modal-ativo').setAttribute('aria-hidden', 'false');
    $('descricao').focus();
  }

  function fecharModal() {
    $('modal-ativo').classList.remove('aberto');
    $('modal-ativo').setAttribute('aria-hidden', 'true');
  }

  async function salvarAtivo(event) {
    event.preventDefault();
    const payload = {};
    campos.forEach(campo => {
      const valor = $(campo).value;
      payload[campo] = campo === 'ram_gb' || campo === 'armazenamento_gb' ? (valor === '' ? null : Number(valor)) : (normalizar(valor) || null);
    });
    if (!payload.descricao || !payload.categoria) {
      feedback('Preencha a descrição e a categoria do equipamento.', true);
      return;
    }
    const id = $('ativo-id').value;
    const botao = $('btn-salvar-ativo');
    botao.disabled = true; texto(botao, 'Salvando...');
    const query = id
      ? await db.from('ativos').update(payload).eq('id', id)
      : await db.from('ativos').insert(payload);
    botao.disabled = false; texto(botao, id ? 'Salvar alterações' : 'Salvar ativo');
    if (query.error) {
      console.error('Erro ao salvar ativo:', query.error);
      feedback(`Não foi possível salvar. Verifique as colunas e as permissões da tabela ativos: ${query.error.message}`, true);
      return;
    }
    fecharModal();
    feedback(id ? 'Ativo atualizado com sucesso.' : 'Ativo cadastrado com sucesso.');
    await carregarAtivos();
  }

  async function excluirAtivo(id) {
    const item = ativos.find(ativo => String(ativo.id) === String(id));
    if (!item || !window.confirm(`Deseja excluir o ativo "${item.descricao || item.modelo || id}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await db.from('ativos').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir ativo:', error);
      feedback(`Não foi possível excluir o ativo: ${error.message}`, true);
      return;
    }
    feedback('Ativo excluído com sucesso.');
    await carregarAtivos();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btn-novo-ativo').addEventListener('click', () => abrirModal());
    $('btn-fechar-modal').addEventListener('click', fecharModal);
    $('btn-cancelar').addEventListener('click', fecharModal);
    $('modal-ativo').addEventListener('click', event => { if (event.target === $('modal-ativo')) fecharModal(); });
    $('form-ativo').addEventListener('submit', salvarAtivo);
    $('btn-atualizar').addEventListener('click', carregarAtivos);
    $('filtro-busca').addEventListener('input', aplicarFiltros);
    $('filtro-categoria').addEventListener('change', aplicarFiltros);
    $('filtro-fabricante').addEventListener('change', aplicarFiltros);
    $('btn-limpar-filtros').addEventListener('click', () => { $('filtro-busca').value = ''; $('filtro-categoria').value = ''; $('filtro-fabricante').value = ''; aplicarFiltros(); });
    carregarAtivos();
  });
})();
