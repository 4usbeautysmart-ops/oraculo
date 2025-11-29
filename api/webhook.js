import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAS41wXsG-LIXJFKhhbrKmFVlAnBL1vRhU",
  authDomain: "oraculo-810d5.firebaseapp.com",
  projectId: "oraculo-810d5",
  storageBucket: "oraculo-810d5.firebasestorage.app",
  messagingSenderId: "695419482522",
  appId: "1:695419482522:web:8be162ff1922f4e2950a23",
};

if (!getApps().length) initializeApp(firebaseConfig);
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    console.log("📩 Webhook recebido:", req.body);

    const { type, data } = req.body;

    // ⛔ Só processa eventos de pagamento
    if (type !== "payment") {
      console.log("Ignorando evento:", type);
      return res.status(200).json({ status: "ignored" });
    }

    const paymentId = data.id;
    if (!paymentId) {
      console.log("❌ Webhook sem paymentId");
      return res.status(400).json({ error: "paymentId ausente" });
    }

    // 🔐 Conecta Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const payment = new Payment(client);

    // 🎯 Busca detalhes do pagamento
    const info = await payment.get({ id: paymentId });

    console.log("💰 Pagamento consultado:", info);

    // 🟡 Somente processa quando o pagamento for aprovado
    if (info.status !== "approved") {
      console.log("Pagamento não aprovado:", info.status);
      return res.status(200).json({ message: "Pagamento ignorado" });
    }

    // 🎯 Recupera o userId enviado no metadata
    const userId = info.metadata?.userId;

    if (!userId) {
      console.log("❌ Metadata sem userId");
      return res.status(400).json({ error: "userId ausente no metadata" });
    }

    // ⏳ Calcula expiração (30 dias)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const ref = doc(db, "users", userId);
    // 🔥 Salva no Firestore
    await updateDoc(ref, {
      subscriptionStatus: "active",
      paymentId: data.id,
      accessUntil: expiresAt,
      updatedAt: Date.now(),
    });

    console.log(
      `✅ Acesso liberado ao usuário ${userId} até ${new Date(expiresAt)}`
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Erro no webhook:", error);
    return res.status(500).json({ error: "Erro interno no webhook" });
  }
}
