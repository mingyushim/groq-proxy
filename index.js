app.get("/chat", async (req, res) => {
  const { prompt, user, system } = req.query;  // system 추가

  if (!prompt || !user) {
    return res.status(400).json({ error: "Missing prompt or user" });
  }

  // 기본 system 메시지
  const systemMessage = system || "You are a helpful Korean chatbot.";

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: systemMessage, // 여기에 system 반영
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
