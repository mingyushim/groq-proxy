app.get("/chat", async (req, res) => {
  const { prompt, user, system } = req.query;

  if (!prompt || !user) {
    return res.status(400).json({ error: "Missing prompt or user" });
  }

  const systemMessage = system
    ? system
    : "능글맞은 한국인 친구처럼 답해줘 답은 20자를 넘으면안돼"; // 한국어로 통일

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
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
