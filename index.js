import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { prompt, user } = req.body;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Groq Proxy Server is running!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
