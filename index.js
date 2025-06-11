const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =======================
// 💬 룬 및 챗봇 처리 라우트
// =======================
app.get("/chat", async (req, res) => {
  const { prompt, system, memory } = req.query;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // 🔍 룬 명령어 처리
  if (prompt.startsWith("!룬")) {
    const parts = prompt.split(" ");
    if (parts.length < 2) {
      return res.json({ reply: "룬 명령어 사용법: !룬 숫자(예: !룬 01)" });
    }

    const klass = parts[1].padStart(2, "0");

    try {
      const response = await axios.get(`https://mabimobi.life/d/api/v1/rune-tiers?klass=${klass}`, {
        headers: {
          "Accept": "application/json",
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
        const safeRuneName = r.rune.name
          .replace(/[\n\r\t]/g, " ")
          .replace(/[<>]/g, "")
          .trim();

        if (!groupedRunes[categoryName]) {
          groupedRunes[categoryName] = [];
        }
        groupedRunes[categoryName].push(safeRuneName);
      });

      let replyText = `${klass} 직업의 1티어 룬:\n`;

      Object.keys(groupedRunes).forEach(category => {
        replyText += `\n[${category}]\n`;
        replyText += groupedRunes[category].join(" · ") + "\n";
      });

      return res.json({ reply: replyText.trim() });

    } catch (error) {
      console.error("룬 API 호출 오류:", error.response?.data || error.message);
      return res.json({ reply: "룬 정보를 가져오는 중 오류가 발생했습니다." });
    }
  }

  // 🤖 일반 챗봇 응답
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

// =======================
// 🕳️ 딥홀 상태 감지 기능
// =======================
const DEEP_HOLE_API = "https://mabimobi.life/d/api/v1/main/deep-hole";
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1382217136667230218/mwewhH4pp6kOjvWGji_9ZfsTdFeVUmwD2T_tAjWNbV4CFCTdRpRpdj4-0JSmuL8tTNN7";

let lastState = null;

const checkDeepHoleState = async () => {
  try {
    const response = await axios.get(DEEP_HOLE_API);
    const servers = response.data;

    const server03 = servers.find(s => s.server === "03");

    if (!server03) {
      console.warn("03번 서버를 찾을 수 없습니다.");
      return;
    }

    const currentState = server03.state;

    if (lastState !== null && currentState !== lastState) {
      const messageText = currentState === "area" ? "심층구멍 생겻심" : "심층구멍없심";

      const message = {
        content: `⚠️ 03번 서버 상태 변경: ${messageText}`
      };

      await axios.post(DISCORD_WEBHOOK_URL, message, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      console.log(`🔔 상태 변경: ${lastState} -> ${currentState} (${messageText})`);
    }

    lastState = currentState;
  } catch (error) {
    console.error("딥홀 상태 확인 중 오류:", error?.response?.data || error.message);
  }
};

checkDeepHoleState(); // 서버 시작 시 한 번 실행
setInterval(checkDeepHoleState, 60 * 1000); // 1분마다 체크

// =======================
// 🚀 서버 시작
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
