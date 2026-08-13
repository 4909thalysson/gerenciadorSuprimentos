// Tudo isolado dentro desta função pra nunca colidir com as
// constantes/variáveis que cada página já declara no seu próprio
// arquivo (reserva.js, paginasimpressas.js, etc.)
(function () {

  const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

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

})()