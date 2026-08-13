const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

// Se já existe uma sessão válida, pula direto pra tela principal
async function verificarSessaoExistente() {
  const { data } = await db.auth.getSession()
  if (data.session) {
    window.location.href = "/index.html"
  }
}

function mostrarErro(mensagem) {
  const el = document.getElementById("login-erro")
  el.textContent = mensagem
  el.classList.add("ativo")
}

function limparErro() {
  const el = document.getElementById("login-erro")
  el.textContent = ""
  el.classList.remove("ativo")
}

async function fazerLogin(e) {
  e.preventDefault()
  limparErro()

  const email = document.getElementById("login-email").value.trim()
  const senha = document.getElementById("login-senha").value
  const botao = document.getElementById("btn-entrar")

  botao.disabled = true
  botao.textContent = "Entrando..."

  const { error } = await db.auth.signInWithPassword({
    email: email,
    password: senha
  })

  if (error) {
    botao.disabled = false
    botao.textContent = "Entrar"

    if (error.message === "Invalid login credentials") {
      mostrarErro("E-mail ou senha incorretos.")
    } else {
      mostrarErro("Não foi possível entrar: " + error.message)
    }
    return
  }

  window.location.href = "/index.html"
}

document.getElementById("form-login").addEventListener("submit", fazerLogin)

verificarSessaoExistente()