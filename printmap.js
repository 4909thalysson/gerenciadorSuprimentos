const printers = [

{
nome: "Brother DCP L2540DM",
setor: "Recepção",
ip: "http://192.168.2.87/general/status.html",
alugada:false,
},

{
nome: "Brother DCP L3551 CDW",
setor: "Direção",
ip: "http://192.168.2.97/general/status.html",
alugada:false,
},

{
nome: "Brother DCP L5652DN",
setor: "Fiscal",
ip: "http://192.168.2.63/general/status.html",
alugada:false,
},

{
nome: "EPSON Workforce C5890",
setor: "Recursos Humanos",
ip: "https://192.168.2.116/PRESENTATION/ADVANCED/COMMON/TOP",
alugada:true,
},

{
nome: "HP MFP M127",
setor: "Almoxarifado",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "Brother DCP L3560",
setor: "Laboratório",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "Pantum BM5100 FDW",
setor: "Faturamento",
ip: "https://192.168.000.000",
alugada:true,
},

{
nome: "HP MFP M225 DW",
setor: "Financeiro/Tatiane",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "Epson WorkForce M5899",
setor: "Balança",
ip: "https://192.168.000.000",
alugada:true,
},

{
nome: "Brother DCP 1617 NW",
setor: "Produção Armazem/CQB",
ip: "http://192.168.2.68/general/status.html",
alugada:false,
},

{
nome: "Brother DCP-8157DN",
setor: "Produção Campo",
ip: "http://192.168.2.67/general/information.html?kind=item",
alugada:false,
},

{
nome: "HP MFP 479 FDW",
setor: "Seg Trabalho",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "HP M15W",
setor: "Produção Fazendas",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "HP P1102W",
setor: "Portaria",
ip: "https://192.168.000.000",
alugada:false,
},

{
nome: "HP Deskjet 3636",
setor: "Refeitório",
alugada:false,
},

{
nome: "HP MFP M225dw",
setor: "Financeiro",
ip: "http://192.168.0.22",
alugada:false,
}

];

const container = document.getElementById("printmap");

printers.forEach(printer => {

let webLink = "";

if(printer.ip){
    webLink = `<a href="${printer.ip}" target="_blank">🌐 Web</a>`;
}else{
    webLink = `<span class="no-web">Sem Web</span>`;
}

let aluguelTag = "";

if(printer.alugada){
aluguelTag = `<span class="alugada">Alugada</span>`;
}

const card = document.createElement("div");
card.className = "printer";

card.innerHTML = `

<div class="icon" style="font-size:40px">🖨️</div>

<h3>${printer.nome}</h3>

<p>${printer.setor}</p>

<div class="links">

${webLink}

${aluguelTag}

</div>

`;

container.appendChild(card);

});