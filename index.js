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
            content: "You are a friendly Korean-speaking AI chatbot. Always respond in Korean only. Do not translate from English — think and answer directly in Korean. Keep your responses concise, within 30 characters."
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
