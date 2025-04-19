console.log("API KEY:", process.env.GROQ_API_KEY); 

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/", async (req, res) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: req.body.messages,
    }),
  });

  const data = await response.json();
  res.json(data);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
