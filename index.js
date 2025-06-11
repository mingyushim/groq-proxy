const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1382217136667230218/mwewhH4pp6kOjvWGji_9ZfsTdFeVUmwD2T_tAjWNbV4CFCTdRpRpdj4-0JSmuL8tTNN7";

const categoryMap = {
  "01": "무기",
  "02": "방어구",
  "03": "악세사리",
  "04": "앰블럼"
};

const serverNames = {
  "01": "데이안",
  "02": "아이라",
  "03": "던컨",
  "04": "알리사",
  "05": "메이븐",
  "06": "라사",
  "07": "칼릭스"
};

// 모든 서버 상태 추적용
let previousStatusMap = {}; // { "01": "열렸심", ... }

app.get("/chat", async (req, res) => {
  const { prompt, system, memory } = req.query;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // 룬 명령어 처리
  if (prompt.startsWith("!룬")) {
    const parts = prompt.split(" ");
    if (parts.length < 2) {
      return res.json({ reply: "룬 명령어 사용법: !룬 숫자 (예: !룬 01)" });
    }

    const klass = parts[1].padStart(2, "0");

    try {
      const response = await axios.get(`https://mabimobi.life/d/api/v1/rune-tiers?klass=${klass}`);
      const runes = response.data;
      const tier1Runes = runes.filter(r => r.tier === 1);

      if (tier1Runes.length === 0) {
        return res.json({ reply: `${klass}에 대한 1티어 룬이 없습니다.` });
      }

      const groupedRunes = {};
      tier1Runes.forEach(r => {
        const cat = categoryMap[r.rune.category] || "기타";
        const name = r.rune.name.replace(/[\n\r\t<>]/g, " ").trim();
        if (!groupedRunes[cat]) groupedRunes[cat] = [];
        groupedRunes[cat].push(name);
      });

      let replyText = `${klass} 직업의 1티어 룬:\n`;
      for (const [cat, list] of Object.entries(groupedRunes)) {
        replyText += `\n[${cat}]\n${list.join(" · ")}\n`;
      }

      return res.json({ reply: replyText.trim() });

    } catch (error) {
      console.error("룬 API 오류:", error.message);
      return res.json({ reply: "룬 정보를 가져오는 중 오류가 발생했습니다." });
    }
  }

  // 일반 챗 처리
  const systemMessage = system || "센스있고 능글맞은 한국인 친구처럼 20자 내로 대답해줘";
  const memoryList = memory ? decodeURIComponent(memory).split("|") : [];

  const memoryMessages = memoryList.map(text => {
    if (text.startsWith("유저: ")) {
      return { role: "user", content: text.replace("유저: ", "") };
    } else if (text.startsWith("봇: ")) {
      return { role: "assistant", content: text.replace("봇: ", "") };
    }
    return { role: "user", content: text };
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
    console.error("Groq API 오류:", error.message);
    res.status(500).json({ error: "Groq API 호출 실패" });
  }
});

// 디스코드 임베드 전송
async function sendDiscordAlert(serverCode, statusText) {
  const serverName = serverNames[serverCode] || serverCode;

  const embed = {
    title: `🔔 ${serverName} 서버 심층구멍 상태`,
    description: `현재 상태: **${statusText}**`,
    color: statusText === "열렸심" ? 0x00ff00 : 0xff0000
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
    console.log(`[알림] ${serverName} - ${statusText}`);
  } catch (err) {
    console.error("디스코드 웹훅 오류:", err.message);
  }
}

// 심층구멍 상태 체크
async function checkDeepHoleStatus() {
  try {
    const response = await axios.get("https://mabimobi.life/d/api/v1/main/deep-hole");
    const data = response.data;

    for (const item of data) {
      const serverCode = item.server;
      const currentStatus = item.open ? "열렸심" : "닫혔심";

      if (previousStatusMap[serverCode] === undefined) {
        // 최초 실행: 무조건 알림
        await sendDiscordAlert(serverCode, currentStatus);
      } else if (previousStatusMap[serverCode] !== currentStatus) {
        // 상태 변화 시: 알림
        await sendDiscordAlert(serverCode, currentStatus);
      }

      previousStatusMap[serverCode] = currentStatus;
    }
  } catch (error) {
    console.error("심층구멍 상태 확인 오류:", error.message);
  }
}

// 최초 실행 1회 + 이후 반복 체크
checkDeepHoleStatus();
setInterval(checkDeepHoleStatus, 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
