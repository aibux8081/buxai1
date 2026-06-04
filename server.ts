import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing support with boundary check
  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI Client
  let ai: GoogleGenAI | null = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      console.warn("GEMINI_API_KEY is not defined in the environment.");
    }
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
  }

  // API router for chatbot prompt routing
  app.post("/api/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error: "AI_CLIENT_NOT_INITIALIZED",
          message: "Yapay zeka motoru başlatılamadı. Lütfen GEMINI_API_KEY ayarını kontrol edin."
        });
      }

      const { messages, systemPrompt } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: "INVALID_MESSAGES_FORMAT",
          message: "Lütfen geçerli bir mesaj geçmişi dizisi gönderin."
        });
      }

      // Format the messages array to the format expected by `@google/genai` API
      // Converts our client-side format to { role: 'user' | 'model', parts: [{ text: string }] }
      const contents = messages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content || "" }]
      }));

      // Call Gemini API 3.5 Flash (highly responsive, perfect for conversational flow)
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt || "Sen BUX AI olarak modern, çok yönlü ve Türkçe konuşan yapay zeka asistanısın. Kullanıcı sorularına anlaşılır, yardımcı ve her zaman saygılı yanıtlar ver. Detaylı cevaplarında Markdown formatını (kalın yazılar, listeler, tablolar, kod blokları) zengin ve okunaklı bir şekilde kullan. Cevap dili her zaman Türkçe olsun.",
          temperature: 0.7,
          topP: 0.95
        }
      });

      const responseText = response.text || "";

      res.json({
        success: true,
        content: responseText
      });
    } catch (error: any) {
      console.error("Gemini API Error in /api/chat:", error);
      res.status(500).json({
        error: "GEMINI_API_FAILURE",
        message: "Yapay zeka yanıt oluştururken bir sorunla karşılaştı.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Vite integration as middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched and running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical error while booting Server container:", error);
});
