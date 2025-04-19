import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // .env에서 API 키 불러오기

const app = express();
app.use(cors());
app.use(express.json());

app.post("/", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "❗ 올바른 messages 형식이 아닙니다." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      res.status(500).json({ error: "⚠ Groq 응답이 없습니다." });
    }
  } catch (error) {
    console.error("❌ 서버 오류:", error);
    res.status(500).json({ error: "⚠ 서버 처리 중 오류 발생" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 (포트 ${PORT})`);
});
