const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get("/chat", async (req, res) => {
  const { prompt, system, memory } = req.query;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const systemMessage = system || "센스있고 능글맞은 한국인 친구처럼 20자 내로 대답해줘";
  const memoryList = memory ? decodeURIComponent(memory).split("|") : [];

  const memoryMessages = memoryList.map(text => {
    if (text.startsWith("유저: ")) {
      return { role: "user", content: text.replace("유저: ", "") };
    } else if (text.startsWith("봇: ")) {
      return { role: "assistant", content: text.replace("봇: ", "") };
    } else {
      return { role: "user", content: text };
    }
  });

  const messages = [
    { role: "system", content: systemMessage },
    ...memoryMessages,
    { role: "user", content: prompt }
  ];

  // !룬 명령어 처리
  if (prompt.startsWith("!룬")) {
    const parts = prompt.split(" ");
    const klassCode = parts[1];

    if (!klassCode || klassCode.length !== 2) {
      return res.json({ reply: "룬 명령어 사용법: !룬 숫자(예: !룬 01)" });
    }

    const runeApiUrl = `https://mabimobi.life/d/api/v1/rune-tiers?klass=${klassCode}`;
    console.log("🛠️ 디버깅: mabimobi API 호출 URL:", runeApiUrl);

    try {
      const runeResponse = await axios.get(runeApiUrl, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        }
      });

      const runeData = runeResponse.data;
      console.log("🛠️ 디버깅: mabimobi API 응답 데이터:", runeData);

      if (!runeData || !runeData.tiers || runeData.tiers.length === 0) {
        return res.json({ reply: `${klassCode}에 대한 티어 룬 정보를 찾을 수 없습니다.` });
      }

      const tier1Runes = runeData.tiers.find(tier => tier.tier === 1);
      if (!tier1Runes || !tier1Runes.runes || tier1Runes.runes.length === 0) {
        return res.json({ reply: `${klassCode}에 대한 1티어 룬 정보를 찾을 수 없습니다.` });
      }

      // 룬 이름만 추출
      const runeNames = tier1Runes.runes.map(rune => rune.name).join(", ");
      return res.json({ reply: `1티어 룬: ${runeNames}` });
    } catch (error) {
      console.error("mabimobi API 호출 에러:", error?.response?.data || error.message);
      return res.status(500).json({ error: "mabimobi API 호출 실패" });
    }
  }

  // 기본 GROQ API 처리
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: messages,
        max_tokens: 100
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`
        }
      }
    );

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Groq API 호출 실패" });
  }
});

// 마지막에 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
