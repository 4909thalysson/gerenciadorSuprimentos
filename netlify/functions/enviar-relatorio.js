const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        from: "onboarding@resend.dev", // 👈 ajuste importante
        to: ["thalysson.oliveira@cambai.com.br"],
        subject: "Relatório de Suprimentos",
        html: html
    })
})

// 👇 CAPTURA REAL DO RESULTADO
const resultado = await response.text()

console.log("STATUS RESEND:", response.status)
console.log("RESPOSTA RESEND:", resultado)

// 👇 TRATAR ERRO DE VERDADE
if (!response.ok) {
    return {
        statusCode: 500,
        body: JSON.stringify({
            erro: "Falha ao enviar email",
            status: response.status,
            detalhe: resultado
        })
    }
}

// 👇 SUCESSO REAL
return {
    statusCode: 200,
    body: JSON.stringify({
        ok: true,
        resend: resultado
    })
}