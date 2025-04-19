const express = require('express');
const axios = require('axios');

const app = express();
const port = 8080;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Groq Proxy Server is running!');
});

app.post('/chat', async (req, res) => {
  const { prompt, user } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  try {
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
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      }
    );

    const reply = response.data.choices?.[0]?.message?.content?.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Groq API Error:', error?.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
