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
  if (req.method !== "POST") return res.status(405).end();

  console.log("📩 Webhook recebido:", req.body);

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });

  try {
    const { type, data } = req.body;

    // -----------------------------
    // 🔵 1. ASSINATURA RECORRENTE
    // -----------------------------
    if (type === "preapproval") {
      const preapproval = new PreApproval(client);
      const assinatura = await preapproval.get({ id: data.id });

      const userId = assinatura.external_reference;
      const status = assinatura.status; // authorized | paused | cancelled

      if (!userId) return res.status(200).send("NO_REF");

      const ref = doc(db, "users", userId);

      if (status === "authorized") {
        await updateDoc(ref, {
          subscriptionStatus: "active",
          preapprovalId: data.id,
          updatedAt: Date.now(),
        });
      }

      if (status === "paused" || status === "cancelled") {
        await updateDoc(ref, {
          subscriptionStatus: "canceled",
          updatedAt: Date.now(),
        });
      }

      return res.status(200).send("OK");
    }

    // -----------------------------
    // 🟢 2. PAGAMENTO AVULSO (PIX, DÉBITO, CRÉDITO)
    // -----------------------------
    if (type === "payment") {
      const payment = new Payment(client);
      const info = await payment.get({ id: data.id });

      const status = info.status; // approved | pending | rejected
      const userId = info.external_reference; // precisa vir da sua preference

      if (!userId) return res.status(200).send("NO_REF");

      const ref = doc(db, "users", userId);

      if (status === "approved") {
        // Liberar acesso por 30 dias
        const accessUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;

        await updateDoc(ref, {
          subscriptionStatus: "active",
          paymentId: data.id,
          accessUntil,
          updatedAt: Date.now(),
        });
      }

      return res.status(200).send("OK");
    }

    return res.status(200).send("IGNORED");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ error: true });
  }
}
