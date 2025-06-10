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

  // 룬 명령어인지 확인
  if (prompt.startsWith("!룬")) {
    const parts = prompt.split(" ");
    const klass = parts[1] || "";

    if (!klass.match(/^\d+$/)) {
      return res.json({ reply: "룬 명령어 사용법: !룬 숫자(예: !룬 01)" });
    }

    try {
      const apiResponse = await axios.get(`https://mabimobi.life/d/api/v1/rune-tiers?klass=${klass}`, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate", // zstd 빼버리기!
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          Referer: "https://mabimobi.life/runes",
        },
      });

      const runes = apiResponse.data;
      // 디버깅용 로그 추가
      console.log("DEBUG: API runes =", runes);

      if (!Array.isArray(runes) || runes.length === 0) {
        return res.json({ reply: `${klass}에 대한 티어 룬 정보를 찾을 수 없습니다.`, debug: runes });
      }

      // 1티어 룬만 필터
      const tier1Runes = runes.filter(r => r.tier === 1);

      if (tier1Runes.length === 0) {
        return res.json({ reply: `${klass}에 대한 1티어 룬이 없습니다.`, debug: runes });
      }

      // 1티어 룬 이름 리스트 만들기
      const runeNames = tier1Runes.map(r => r.rune.name).join(", ");
      return res.json({ reply: `${klass} 직업의 1티어 룬: ${runeNames}`, debug: runes });

    } catch (error) {
      console.error("룬 API 호출 실패:", error?.response?.data || error.message);
      return res.status(500).json({ error: "룬 API 호출 실패" });
    }
  }

  // 일반 채팅 처리 (Groq API)
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
    { role: "user", content: prompt },
  ];

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "meta-llama/llama-4-maverick-17b-128e-instruct",
        messages: messages,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
