// Guard de sessão: roda o mais cedo possível (logo depois de abrir o
// <body>) e redireciona pra /login.html se não houver sessão ativa,
// antes do resto da página ficar visível. Isolado numa IIFE pra não
// colidir com as constantes de nenhum outro script da página.
(function () {

  const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

  const dbGuard = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  dbGuard.auth.getSession()
    .then(({ data, error }) => {
      if (error || !data.session) {
        window.location.replace("/login.html")
        return
      }
      // Sessão válida: revela a página (estava escondida via
      // body[style="visibility:hidden"] até essa checagem terminar)
      document.body.style.visibility = "visible"
    })
    .catch(() => {
      window.location.replace("/login.html")
    })

})()