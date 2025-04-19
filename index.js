const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch"); // 설치 필요

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Groq Proxy Server is running!");
});

app.post("/chat", async (req, res) => {
  const { prompt, user } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "mixtral-8x7b-32768"
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "응답이 없습니다.";

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
