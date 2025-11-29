import { MercadoPagoConfig, Preference } from "mercadopago";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId, userEmail } = req.body;

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    console.log("❌ MP_ACCESS_TOKEN não configurado");
    return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado." });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const preference = new Preference(client);

    const resposta = await preference.create({
      body: {
        items: [
          {
            id: userId,
            title: "Acesso Mensal - Oráculo da Consciência",
            quantity: 1,
            unit_price: 21.9,
          },
        ],
        payer: { email: userEmail },
        metadata: {
          userId: userId,
          userEmail: userEmail,
        },
        back_urls: {
          success: "https://oraculo-orcin-one.vercel.app/",
        },
        auto_return: "approved",
      },
    });

    return res.status(200).json({
      paymentUrl: resposta.init_point,
      id: resposta.id,
    });
  } catch (error) {
    console.log("🔥 Erro ao criar pagamento:", error);
    return res.status(500).json({ error: "Erro ao criar pagamento" });
  }
}
