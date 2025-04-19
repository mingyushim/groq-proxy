const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 8080;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(express.json());

// ✅ 루트 경로 응답 추가 (중요!)
app.get("/", (req, res) => {
  res.send("Groq Proxy Server is running!");
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Groq API 호출 오류:", error?.message || error);
    res.status(500).send("Groq API 호출 실패");
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
