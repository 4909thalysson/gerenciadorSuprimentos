exports.handler = async (event) => {
    try {
        const data = JSON.parse(event.body)

        const registros = data.registros || []

        // ===============================
        // AGRUPAR POR SETOR
        // ===============================
        const setores = {}

        registros.forEach(r => {
            if (!setores[r.setor]) setores[r.setor] = []
            setores[r.setor].push(r)
        })

        // ===============================
        // GERAR HTML
        // ===============================
        let html = `
            <h2>📦 Relatório de Suprimentos</h2>
            <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
        `

        Object.keys(setores).forEach(setor => {

            html += `
                <h3>Setor: ${setor}</h3>

                <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
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
                from: "Relatório <onboarding@resend.dev>",
                to: ["gerenciadorsuprimentosgi@cambai.com"],
                subject: "Relatório de Suprimentos",
                html: html
            })
        })

        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true })
        }

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        }
    }
}