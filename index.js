const axios = require("axios");
require("dotenv").config(); // .env 파일에서 OPENAI_API_KEY 로드

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getGPTResponse(messages) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo", // 또는 "gpt-4" 사용 가능
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    return reply;
  } catch (error) {
    console.error("Error calling OpenAI GPT-4 API:", error.response?.data || error.message);
    return null;
  }
}

// 예시 메시지
const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "GPT-4야, 오늘 할 일 목록을 만들어줘." }
];

getGPTResponse(messages).then((reply) => {
  if (reply) {
    console.log("GPT-4 응답:", reply);
  } else {
    console.log("응답을 받지 못했습니다.");
  }
});
