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

  // === !룬 명령 처리 ===
  if (prompt.startsWith("!룬")) {
    const parts = prompt.trim().split(" ");
    if (parts.length < 2) {
      return res.json({ reply: "!룬 [숫자] 형식으로 입력해주세요 (예: !룬 1)" });
    }

    const klassRaw = parts[1];
    const klass = klassRaw.padStart(2, '0');  // '1' → '01' 처리
    const apiUrl = `https://mabimobi.life/d/api/v1/rune-tiers?klass=${klass}`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://mabimobi.life/runes',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        }
      });

      const data = response.data;

      // 1티어 룬 추출 (tier === 1)
      const tier1 = data?.tiers?.find(t => t.tier === 1);
      const tier1Runes = tier1?.runes || [];

      if (tier1Runes.length === 0) {
        return res.json({ reply: `klass=${klass}에 대한 1티어 룬 정보를 찾을 수 없습니다.` });
      }

      // 텍스트 구성
      const replyText = `📜 ${klass}번 직업 1티어 룬 목록:\n` +
        tier1Runes.map(rune => `- ${rune.name}`).join("\n");

      return res.json({ reply: replyText });
    } catch (error) {
      console.error("룬 API error:", error?.response?.data || error.message);
      return res.status(500).json({ reply: "룬 정보를 가져오는 중 오류가 발생했습니다." });
    }
  }

  // === 기존 Groq API 처리 ===
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
