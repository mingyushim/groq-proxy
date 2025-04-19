const express = require('express');
const axios = require('axios');
const app = express();
const port = 8080;

// JSON 바디 파싱을 위해 필요
app.use(express.json());

// 기본 루트 확인용
app.get('/', (req, res) => {
  res.send('Groq Proxy Server is running!');
});

// 카카오봇에서 요청할 /chat 라우트
app.post('/chat', async (req, res) => {
  const { prompt, user } = req.body;

  // prompt 누락 시
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  try {
    // Groq API 요청
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    // 응답에서 텍스트 추출
    const reply = response.data.choices?.[0]?.message?.content?.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Groq API Error:', error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data || 'Internal Server Error' });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
