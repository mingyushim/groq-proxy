import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// .env 파일에서 환경변수 불러오기
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    // 환경변수가 제대로 설정되지 않은 경우 에러 출력
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY is missing" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: req.body.messages,
      }),
    });

    const data = await response.json();

    // Groq API에서 에러 응답이 온 경우
    if (!response.ok) {
      console.error("Groq API Error:", data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
