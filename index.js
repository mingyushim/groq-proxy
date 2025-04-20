// ✅ 기억 기능이 추가된 index.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(cors());

// 🧠 사용자별 기억 저장소 (메모리 기반)
const userMemory = {};

app.get("/", (req, res) => {
  res.send("Groq Proxy Server with Memory is running!");
});

app.get("/chat", async (req, res) => {
  const { prompt, user } = req.query;

  if (!prompt || !user) {
    return res.status(400).json({ error: "Missing prompt or user" });
  }

  try {
    // 🧠 기억 프롬프트 조립
    const memory = userMemory[user] || "";
    const memoryPrompt = memory ? `사용자 정보: ${memory}` : "";

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct", 
        messages: [
          {
            role: "system",
            content:
              "You are a friendly Korean-speaking AI chatbot. Always respond in Korean only. Do not translate from English — think and answer directly in Korean. Keep your responses concise, within 20 characters." +
              (memoryPrompt ? "\n" + memoryPrompt : ""),
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const reply = response.data.choices[0].message.content.trim();

    // ✅ 새로운 기억 추출 로직 (간단한 예시)
    if (prompt.includes("나는") || prompt.includes("내가")) {
      const memoryUpdate = prompt.replace(/.*?(나는|내가)/, "").split(/[.!?]/)[0].trim();
      if (memoryUpdate) {
        userMemory[user] = memoryUpdate;
      }
    }

    res.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Groq API 호출 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`Groq Proxy Server running on port ${PORT}`);
});
