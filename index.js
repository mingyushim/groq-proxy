const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(cors());

const userMemory = {};

app.get("/", (req, res) => {
  res.send("Groq Proxy Server is running!");
});

app.get("/chat", async (req, res) => {
  const { prompt, user } = req.query;

  if (!prompt || !user) {
    return res.status(400).json({ error: "Missing prompt or user" });
  }

  const memory = extractUserMemory(prompt);
  if (memory) {
    if (!userMemory[user]) userMemory[user] = [];
    userMemory[user].push(memory);
    if (userMemory[user].length > 5) {
      userMemory[user].shift();
    }
  }

  const memoryContext = userMemory[user]?.join("\n") || "";

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly Korean-speaking AI chatbot. Always respond in Korean only. Do not translate from English — think and answer directly in Korean. Keep your responses concise, within 20 characters.\n" + memoryContext,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
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

function extractUserMemory(text) {
  const memoryRegex = /^(나는|내가|내\s)/;
  if (memoryRegex.test(text)) {
    return text;
  }
  return null;
}

app.listen(PORT, () => {
  console.log(`Groq Proxy Server running on port ${PORT}`);
});
