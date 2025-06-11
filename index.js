const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1382217136667230218/mwewhH4pp6kOjvWGji_9ZfsTdFeVUmwD2T_tAjWNbV4CFCTdRpRpdj4-0JSmuL8tTNN7";

let previousOpenServers = [];

// 심층 구멍 오픈 서버 가져오기
async function fetchOpenServers() {
  try {
    const res = await axios.get("https://mabimobi.life/d/api/v1/deep-hole-reports");
    const now = new Date();
    const valid = res.data.filter(entry => new Date(entry.expired) > now);
    const latestByServer = {};

    // 서버별 가장 최신 데이터 유지
    valid.forEach(item => {
      const s = item.server;
      if (!latestByServer[s] || new Date(item.expired) > new Date(latestByServer[s].expired)) {
        latestByServer[s] = item;
      }
    });

    return Object.keys(latestByServer).sort(); // ['04', '05', '07'] 형태
  } catch (err) {
    console.error("❌ 심층구멍 API 오류:", err.message);
    return [];
  }
}

// 웹훅 전송 함수
async function sendDiscordMessage(servers) {
  const serverText = servers.length > 0 ? servers.map(s => `서버 ${s}`).join(", ") : "없음";
  const message = {
    content: `🕳️ 현재 심층 구멍 열린 서버: ${serverText}`
  };
  try {
    await axios.post(DISCORD_WEBHOOK, message);
    console.log("✅ 디스코드 알림 전송됨:", serverText);
  } catch (err) {
    console.error("❌ 디스코드 웹훅 전송 실패:", err.message);
  }
}

// 상태 주기 체크 함수
async function monitorDeepHole() {
  const currentOpen = await fetchOpenServers();

  // 최초 실행 또는 변경 사항 감지 시 전송
  const changed =
    currentOpen.length !== previousOpenServers.length ||
    currentOpen.some((s, i) => s !== previousOpenServers[i]);

  if (changed) {
    await sendDiscordMessage(currentOpen);
    previousOpenServers = currentOpen;
  }
}

// 최초 실행 후 주기적 체크
monitorDeepHole(); // 서버 시작 시 바로 실행
setInterval(monitorDeepHole, 60 * 1000); // 매 1분마다 체크

// 룬 및 챗봇 처리 라우팅
app.get("/chat", async (req, res) => {
  const { prompt, system, memory } = req.query;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  if (prompt.startsWith("!룬")) {
    const parts = prompt.split(" ");
    if (parts.length < 2) {
      return res.json({ reply: "룬 명령어 사용법: !룬 숫자(예: !룬 01)" });
    }

    const klass = parts[1].padStart(2, "0");

    try {
      const response = await axios.get(`https://mabimobi.life/d/api/v1/rune-tiers?klass=${klass}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });

      const runes = response.data;
      const tier1Runes = runes.filter(r => r.tier === 1);

      if (tier1Runes.length === 0) {
        return res.json({ reply: `${klass}에 대한 1티어 룬이 없습니다.` });
      }

      const categoryMap = {
        "01": "무기",
        "02": "방어구",
        "03": "악세사리",
        "04": "앰블럼"
      };

      const groupedRunes = {};
      tier1Runes.forEach(r => {
        const categoryName = categoryMap[r.rune.category] || "기타";
        const safeRuneName = r.rune.name.replace(/[\n\r\t]/g, " ").replace(/[<>]/g, "").trim();
        if (!groupedRunes[categoryName]) groupedRunes[categoryName] = [];
        groupedRunes[categoryName].push(safeRuneName);
      });

      let replyText = `${klass} 직업의 1티어 룬:\n`;
      Object.keys(groupedRunes).forEach(category => {
        replyText += `\n[${category}]\n${groupedRunes[category].join(" · ")}\n`;
      });

      return res.json({ reply: replyText.trim() });

    } catch (error) {
      console.error("룬 API 호출 오류:", error.response?.data || error.message);
      return res.json({ reply: "룬 정보를 가져오는 중 오류가 발생했습니다." });
    }
  }

  // 일반 챗봇 처리
  const systemMessage = system || "센스있고 능글맞은 한국인 친구처럼 20자 내로 대답해줘";
  const memoryList = memory ? decodeURIComponent(memory).split("|") : [];

  const memoryMessages = memoryList.map(text =>
    text.startsWith("유저: ")
      ? { role: "user", content: text.replace("유저: ", "") }
      : text.startsWith("봇: ")
      ? { role: "assistant", content: text.replace("봇: ", "") }
      : { role: "user", content: text }
  );

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
        messages,
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

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
