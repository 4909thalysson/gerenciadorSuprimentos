(() => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  const group = document.getElementById('ti-menu-group');
  const groupToggle = document.getElementById('ti-menu-toggle');
  const submenu = document.getElementById('ti-submenu');

  if (!sidebar || !toggle || !group || !groupToggle || !submenu) return;

  const path = window.location.pathname.toLowerCase();
  const current = path.endsWith('/ativos.html') ? 'ativos'
    : path.endsWith('/manutencao.html') ? 'manutencao'
    : path.endsWith('/acompanhamento.html') ? 'acompanhamento' : '';

  function setSidebar(open) {
    sidebar.classList.toggle('expanded', open);
    if (backdrop) backdrop.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  function setSubmenu(open) {
    group.classList.toggle('aberto', open);
    submenu.hidden = !open;
    groupToggle.setAttribute('aria-expanded', String(open));
  }

  // Mantém o submenu aberto logicamente na página atual.
  // A barra lateral continua recolhida até o usuário expandi-la.
  if (current) {
    setSubmenu(true);

    const activeLink = submenu.querySelector(`[data-ti-page="${current}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.setAttribute('aria-current', 'page');
    }
  } else {
    setSubmenu(false);
  }

  toggle.addEventListener('click', () => {
    setSidebar(!sidebar.classList.contains('expanded'));
  });

  groupToggle.addEventListener('click', () => {
    // No primeiro clique, expande a lateral e mantém o submenu aberto.
    if (!sidebar.classList.contains('expanded')) {
      setSidebar(true);
      setSubmenu(true);
      return;
    }

    setSubmenu(submenu.hidden);
  });

  if (backdrop) {
    backdrop.addEventListener('click', () => setSidebar(false));
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setSubmenu(false);
      setSidebar(false);
    }
  });

  submenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setSidebar(false));
  });

  document.querySelectorAll('#menu > a').forEach(link => {
    link.addEventListener('click', () => setSidebar(false));
  });
})();
