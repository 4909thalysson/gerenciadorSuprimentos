exports.handler = async (event) => {
    try {

        const data = JSON.parse(event.body)
        const registros = data.registros || []

        // ===============================
        // GERAR HTML (simplificado)
        // ===============================
        let html = `<h2>Relatório de Suprimentos</h2>`

        // ===============================
        // ENVIO (RESEND)
        // ===============================
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: ["thalysson.oliveira@cambai.com.br"],
                subject: "Relatório de Suprimentos",
                html: html
            })
        })

        const resultado = await response.text()

        console.log("STATUS RESEND:", response.status)
        console.log("RESPOSTA RESEND:", resultado)

        // ===============================
        // TRATAMENTO DE ERRO
        // ===============================
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

        // ===============================
        // SUCESSO
        // ===============================
        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                resend: resultado
            })
        }

    } catch (error) {
        console.error("ERRO:", error)

        return {
            statusCode: 500,
            body: JSON.stringify({
                erro: error.message
            })
        }
    }
}