exports.handler = async (event) => {
    try {
        // ===============================
        // DEBUG: VER O QUE ESTÁ CHEGANDO
        // ===============================
        console.log("BODY RECEBIDO:", event.body)

        // ===============================
        // PARSE SEGURO
        // ===============================
        let data = {}

        try {
            data = event.body ? JSON.parse(event.body) : {}
        } catch (e) {
            console.log("ERRO AO PARSEAR BODY:", event.body)

            return {
                statusCode: 400,
                body: JSON.stringify({ erro: "Body inválido" })
            }
        }

        const registros = data.registros || []

        if (!registros.length) {
            return {
                statusCode: 400,
                body: JSON.stringify({ erro: "Nenhum registro recebido" })
            }
        }

        // ===============================
        // ORGANIZAR POR SETOR
        // ===============================
        const setores = {}

        registros.forEach(r => {
            if (!setores[r.setor]) setores[r.setor] = []
            setores[r.setor].push(r)
        })

        // ===============================
        // GERAR HTML (TABELA REAL)
        // ===============================
        let html = `
            <h2>📦 Relatório de Suprimentos</h2>
            <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
        `

        Object.keys(setores).forEach(setor => {

            html += `
                <h3>Setor: ${setor}</h3>

                <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
                    <tr style="background:#f2f2f2;">
                        <th>Item</th>
                        <th>Cor</th>
                        <th>Un</th>
                        <th>Tipo</th>
                        <th>Data</th>
                    </tr>
            `

            setores[setor].forEach(r => {
                html += `
                    <tr>
                        <td>${r.suprimento}</td>
                        <td>${r.cor || "-"}</td>
                        <td>${r.un}</td>
                        <td>${r.tipo}</td>
                        <td>${r.dataHora ? new Date(r.dataHora).toLocaleString("pt-BR") : "-"}</td>
                    </tr>
                `
            })

            html += `</table><br/>`
        })

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
        console.error("ERRO GERAL:", error)

        return {
            statusCode: 500,
            body: JSON.stringify({
                erro: error.message
            })
        }
    }
}