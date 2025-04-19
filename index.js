import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Groq API Key는 환경변수에 저장되어 있어야 함
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        }
      }
    );

    const reply = response.data.choices?.[0]?.message?.content?.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Groq API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
