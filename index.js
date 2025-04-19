import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { prompt, user } = req.body;

  if (!prompt) {
    return res.json({ reply: "❗ 질문을 입력해주세요. (!대화 질문내용)" });
  }

  try {
    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    const reply = groqResponse.data.choices[0]?.message?.content?.trim();
    res.json({ reply });
  } catch (error) {
    res.json({ error: error.response?.data || "❗ Groq API 호출 중 오류가 발생했습니다." });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Groq Proxy Server is running!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
