import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/proxy', async (req, res) => {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment variables.' });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await groqResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Something went wrong with the proxy.' });
  }
});

app.get('/', (req, res) => {
  res.send('Groq Proxy is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
