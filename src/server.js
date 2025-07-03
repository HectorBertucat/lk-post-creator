import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleDocsExtractor } from './google-docs.js';
import { LLMPostGenerator } from './llm.js';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate LinkedIn post from Google Doc
app.post('/api/generate', async (req, res) => {
  try {
    const { googleDocUrl, customPrompt } = req.body;
    
    if (!googleDocUrl) {
      return res.status(400).json({ error: 'Google Doc URL is required' });
    }

    // Validate Google Docs URL
    if (!googleDocUrl.includes('docs.google.com')) {
      return res.status(400).json({ error: 'Please provide a valid Google Docs URL' });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: API key not found' });
    }

    console.log(`Processing Google Doc: ${googleDocUrl}`);
    
    // Extract content from Google Doc
    const extractor = new GoogleDocsExtractor();
    const extractedContent = await extractor.extractContent(googleDocUrl);
    
    // Generate LinkedIn post
    const generator = new LLMPostGenerator(apiKey);
    const result = await generator.generateLinkedInPost(extractedContent, customPrompt);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Return the generated post
    res.json({
      success: true,
      post: result.post,
      sourceInfo: {
        title: extractedContent.title,
        wordCount: extractedContent.wordCount,
        imageCount: extractedContent.images.length,
        url: googleDocUrl
      },
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    console.error('Error generating post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current prompt template
app.get('/api/prompt', async (req, res) => {
  try {
    const promptPath = path.join(__dirname, '..', 'prompt.txt');
    const prompt = await fs.readFile(promptPath, 'utf-8');
    res.json({ prompt });
  } catch (error) {
    res.status(500).json({ error: 'Could not load prompt template' });
  }
});

// Update prompt template
app.post('/api/prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const promptPath = path.join(__dirname, '..', 'prompt.txt');
    await fs.writeFile(promptPath, prompt);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Could not save prompt template' });
  }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the web interface`);
});