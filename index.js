import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 헬스 체크용 루트 라우트
app.get("/", (req, res) => {
  res.send("Groq proxy server is running!");
});

app.post("/", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not set in environment variables." });
  }

  try {
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to call Groq API", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("✅ Server is running on port 3000");
});
