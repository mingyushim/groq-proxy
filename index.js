const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// 환경변수에서 GROQ_API_KEY 가져오기
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Groq Proxy Server is running!");
});

app.get("/chat", async (req, res) => {
  const { prompt, user } = req.query;

  if (!prompt || !user) {
    return res.status(400).json({ error: "Missing prompt or user" });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "당신은 친절한 한국어 AI 챗봇입니다. 모든 질문에 반드시 한국어로 대답하십시오. 영어로 번역하지 말고, 직접 한국어로 생각해서 대답하십시오. 답변은 30자 이내로 간단히 요약하세요."
          },
          {
            role: "user",
            content: prompt
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Groq API 호출 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`Groq Proxy Server running on port ${PORT}`);
});
