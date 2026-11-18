const PIPEFY_ENDPOINT = "https://api.pipefy.com/graphql";
const PIPE_ID = 306943382;

const FIELD_IDS = {
  movimentacao: "movimenta_o",
  setor: "setor",
  suprimento: "c_digo_do_suprimento",
  quantidade: "quantidade",
  data: "data_da_movimenta_o"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}

function dataLocalISO(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Data da movimentação inválida.");
  return parsed.toISOString().slice(0, 10);
}

function normalizarRegistro(raw) {
  const tipo = String(raw.tipo || "").trim().toUpperCase();
  if (!["ESTOQUE", "REGISTRO"].includes(tipo)) {
    throw new Error("Movimentação deve ser ESTOQUE ou REGISTRO.");
  }

  const setor = String(raw.setor || "").trim();
  const suprimentoBase = String(raw.suprimento || "").trim();
  const cor = String(raw.cor || "").trim();
  const quantidade = Number(raw.quantidade);

  if (!setor || !suprimentoBase) throw new Error("Setor e código do suprimento são obrigatórios.");
  if (!Number.isFinite(quantidade) || quantidade < 0) throw new Error("Quantidade inválida.");

  return {
    tipo,
    opcao: tipo === "ESTOQUE" ? "Estoque" : "Registro",
    setor,
    suprimento: cor ? `${suprimentoBase} (${cor})` : suprimentoBase,
    quantidade: String(quantidade),
    data: dataLocalISO(raw.dataHora)
  };
}

async function validarSessao(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) return false;
  const user = await response.json();
  return Boolean(user && user.id);
}

async function criarCard(token, registro) {
  const query = `
    mutation CreateCard($input: CreateCardInput!) {
      createCard(input: $input) {
        card { id title url }
      }
    }
  `;

  const variables = {
    input: {
      pipe_id: PIPE_ID,
      title: registro.opcao,
      fields_attributes: [
        { field_id: FIELD_IDS.movimentacao, field_value: registro.opcao },
        { field_id: FIELD_IDS.setor, field_value: registro.setor },
        { field_id: FIELD_IDS.suprimento, field_value: registro.suprimento },
        { field_id: FIELD_IDS.quantidade, field_value: registro.quantidade },
        { field_id: FIELD_IDS.data, field_value: registro.data }
      ]
    }
  };

  const response = await fetch(PIPEFY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (!response.ok || result.errors?.length || !result.data?.createCard?.card) {
    const details = result.errors?.map(error => error.message).join("; ");
    throw new Error(details || `Pipefy retornou HTTP ${response.status}.`);
  }
  return result.data.createCard.card;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const token = process.env.PIPEFY_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Configure PIPEFY_TOKEN nas variáveis de ambiente da Vercel." });
  }

  const authorization = req.headers.authorization || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) {
    return res.status(401).json({ error: "Autenticação necessária." });
  }

  try {
    const sessaoValida = await validarSessao(accessToken);
    if (!sessaoValida) return res.status(401).json({ error: "Sessão inválida ou expirada. Entre novamente no sistema." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const registros = req.body?.registros;
  if (!Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: "Informe ao menos um registro." });
  }
  if (registros.length > 100) {
    return res.status(400).json({ error: "Limite de 100 cards por envio." });
  }

  const criados = [];
  const falhas = [];

  for (const raw of registros) {
    try {
      const registro = normalizarRegistro(raw);
      const card = await criarCard(token, registro);
      criados.push({
        id: card.id,
        title: card.title,
        url: card.url,
        tipo: registro.tipo,
        setor: registro.setor,
        suprimento: registro.suprimento
      });
    } catch (error) {
      falhas.push({
        tipo: raw?.tipo || "—",
        setor: raw?.setor || "—",
        suprimento: raw?.suprimento || "—",
        error: error.message
      });
    }
  }

  return res.status(falhas.length && !criados.length ? 502 : 200).json({ criados, falhas });
};
