import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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
    return res.status(405).end();
  }

  try {
    const { type, data } = req.body;

    console.log("📩 Webhook recebido:", req.body);

    // Mercado Pago manda só isso:
    // { type: "preapproval", data: { id: "PREAPPROVAL_ID" } }

    if (type !== "preapproval") {
      return res.status(200).send("IGNORED");
    }

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const preapproval = new PreApproval(client);

    // 1. Consultar detalhes da assinatura
    const assinatura = await preapproval.get({ id: data.id });

    console.log("📌 Dados completos:", assinatura);

    const userId = assinatura.external_reference;
    const status = assinatura.status; // authorized / paused / cancelled

    if (!userId) {
      console.log("❌ Nenhum external_reference encontrado!");
      return res.status(200).send("NO REF");
    }

    const ref = doc(db, "users", userId);

    // 2. Atualizar Firestore conforme status real
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
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({ error: true });
  }
}
