import { MercadoPagoConfig, PreApproval } from "mercadopago";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId, userEmail } = req.body;

  if (!userId || !userEmail) {
    return res.status(400).json({ error: "Dados insuficientes." });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado." });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const preapproval = new PreApproval(client);

    const resposta = await preapproval.create({
      body: {
        reason: "Assinatura Mensal - Oráculo da Consciência",
        external_reference: userId,

        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 21.9, // valor mensal
          currency_id: "BRL",
        },

        back_url: "https://engenharia-de-cortes-5d.vercel.app/",
        payer_email: userEmail,
      },
    });

    return res.status(200).json({
      subscriptionUrl: resposta.init_point, // Link para usuário assinar
      id: resposta.id, // ID do preapproval
    });
  } catch (error) {
    console.log("🔥 Erro ao criar assinatura:", error);
    return res.status(500).json({ error: "Falha ao criar assinatura." });
  }
}
