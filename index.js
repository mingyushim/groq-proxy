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

  // !룬 N 형식 명령어 처리
  if (prompt.startsWith("!룬 ")) {
    const runeNumber = prompt.split(" ")[1];
    console.log(`🛠️ 디버깅: !룬 명령어 감지, 번호: ${runeNumber}`);

    // klass 파라미터 2자리 형식으로 맞추기 (1 -> 01)
    const klassParam = runeNumber.padStart(2, "0");
    const runeApiUrl = `https://mabimobi.life/d/api/v1/rune-tiers?klass=${klassParam}`;
    console.log(`🛠️ 디버깅: mabimobi API 호출 URL: ${runeApiUrl}`);

    try {
      const runeResponse = await axios.get(runeApiUrl, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("🛠️ 디버깅: mabimobi API 응답 데이터:", runeResponse.data);

      const runeData = runeResponse.data;
      if (!runeData || !runeData.tiers || runeData.tiers.length === 0) {
        return res.json({ reply: `${klassParam}에 대한 티어 룬 정보를 찾을 수 없습니다.` });
      }

      // 예: 1티어 룬들 텍스트로 만들기
      const tier1 = runeData.tiers.find(t => t.tier === 1);
      if (!tier1 || !tier1.runes) {
        return res.json({ reply: `${klassParam} 1티어 룬 정보를 찾을 수 없습니다.` });
      }

      const runeNames = tier1.runes.map(r => r.name).join(", ");
      const replyText = `${klassParam} 1티어 룬: ${runeNames}`;
      console.log(`🛠️ 디버깅: 생성할 답변 텍스트: ${replyText}`);

      return res.json({ reply: replyText });
    } catch (error) {
      console.error("🛠️ 디버깅: mabimobi API 호출 에러:", error.response?.data || error.message);
      return res.json({ reply: "룬 정보 조회 중 오류가 발생했습니다." });
    }
  }

  // 일반 프롬프트는 Groq API 호출
  const messages = [
    { role: "system", content: systemMessage },
    ...memoryMessages,
    { role: "user", content: prompt }
  ];

  try {
    console.log("🛠️ 디버깅: Groq API 호출 메시지:", messages);

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
    console.log("🛠️ 디버깅: Groq API 응답:", reply);

    res.json({ reply });
  } catch (error) {
    console.error("🛠️ 디버깅: Groq API 호출 에러:", error.response?.data || error.message);
    res.status(500).json({ error: "Groq API 호출 실패" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
