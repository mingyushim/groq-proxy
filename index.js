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

  // ✅ !랭킹 캐릭터명 요청 처리
  if (prompt.startsWith("!랭킹")) {
    const keyword = prompt.replace("!랭킹", "").trim();

    if (!keyword) {
      return res.json({ reply: "캐릭터명을 입력해 주세요." });
    }

    try {
      const htmlRes = await axios.post(
        "https://mabinogimobile.nexon.com/Ranking/List/rankdata",
        new URLSearchParams({ type: 1, page: 1 }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Referer": "https://mabinogimobile.nexon.com/Ranking/List?t=1",
            "Origin": "https://mabinogimobile.nexon.com",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "X-Requested-With": "XMLHttpRequest"
          }
        }
      );

      const html = htmlRes.data;
      const blocks = html.split('<li class="item');

      let found = null;

      for (const block of blocks) {
        if (block.includes(`data-charactername="${keyword}"`)) {
          const getText = (label) => {
            const index = block.indexOf(`<dt>${label}</dt>`);
            if (index === -1) return "";
            const ddStart = block.indexOf("<dd", index);
            const ddOpen = block.indexOf(">", ddStart) + 1;
            const ddClose = block.indexOf("</dd>", ddOpen);
            return block.substring(ddOpen, ddClose).trim().replace(/\n/g, "");
          };

          const rankMatch = block.match(/<dt>([\d,]+위)<\/dt>/);
          const rank = rankMatch ? rankMatch[1] : "순위 없음";
          const server = getText("서버명");
          const job = getText("클래스");
          const power = getText("전투력");
          found = { rank, server, job, power, name: keyword };
          break;
        }
      }

      if (found) {
        const msg = `${found.name} (${found.server}) - ${found.job}, 전투력 ${found.power}, ${found.rank}`;
        return res.json({ reply: msg });
      } else {
        return res.json({ reply: `${keyword} 님을 랭킹에서 찾을 수 없습니다.` });
      }
    } catch (err) {
      console.error("랭킹 크롤링 오류:", err.message);
      return res.status(500).json({ error: "랭킹 데이터를 가져오는 중 오류 발생" });
    }
  }

  // ✅ 기존 Groq API 처리 유지
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
