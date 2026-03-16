const SUPABASE_URL = "https://kxiapqtfwdwiqnvqjtkf.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aWFwcXRmd2R3aXFudnFqdGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDE5OTcsImV4cCI6MjA4MDcxNzk5N30.IlzANbZ1hSwpPtIeaLcIOkBf2-gIC-XNRehWDYfDins"

const db = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
)

async function carregarImpressoras(){

const { data, error } = await db
.from("reserva")
.select("*")

if(error){
console.error("Erro:", error)
return
}

const container = document.getElementById("printmap")

container.innerHTML = ""

/* remove impressoras duplicadas */
const impressorasUnicas = {}

data.forEach(item => {
impressorasUnicas[item.impressora] = item
})

Object.values(impressorasUnicas).forEach(printer => {

/* acesso web */
let ip = printer.enderecoip

let webLink = ip && ip !== "192.168.0.1"
? `<a href="http://${ip}" target="_blank">🌐 Web</a>`
: `<span class="no-web">Sem Web</span>`

/* classe de status */
let statusClass = ""

if(printer.status === "uso") statusClass = "uso"
if(printer.status === "manutencao") statusClass = "manutencao"
if(printer.status === "inativo") statusClass = "inativo"

/* propriedade */
let propriedade = printer.propriedade === "locacao"
? "🏢 Locação"
: "📦 Próprio"

const card = document.createElement("div")

card.className = "printer"

card.innerHTML = `
<div class="icon">🖨️</div>

<h3>${printer.impressora}</h3>

<p>${printer.setor}</p>

<p class="tipo">${propriedade}</p>

<p class="status ${statusClass}">
${printer.status}
</p>

<div class="links">
${webLink}
</div>
`

container.appendChild(card)

})

}

carregarImpressoras()