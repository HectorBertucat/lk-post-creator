# LinkedIn Post Creator

A tool that extracts content from Google Docs and generates LinkedIn posts using AI (Anthropic Claude).

## Features

- **Google Docs Integration**: Extracts text content and images from Google Docs
- **Web Scraping**: Also supports scraping from regular web articles 
- **AI-Powered**: Uses Anthropic's Claude to generate engaging LinkedIn posts
- **Customizable Prompts**: Use your own prompt templates
- **Multiple Sources**: Process multiple Google Docs or URLs at once
- **CLI Interface**: Easy-to-use command line tool

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your Anthropic API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

## Usage

### Generate LinkedIn Post from Google Docs (Recommended)

Generate a LinkedIn post from a Google Doc:
```bash
npm start google-doc "https://docs.google.com/document/d/your-doc-id/edit"
```

Generate from multiple Google Docs:
```bash
npm start google-doc "https://docs.google.com/document/d/doc1/edit,https://docs.google.com/document/d/doc2/edit"
```

Save the post to a file:
```bash
npm start google-doc "https://docs.google.com/document/d/your-doc-id/edit" --output post.txt
```

Use a custom prompt template:
```bash
npm start google-doc "https://docs.google.com/document/d/your-doc-id/edit" --prompt my-prompt.txt
```

### Generate from Web URLs (Legacy)

Generate a LinkedIn post from a single URL:
```bash
npm start generate "https://example.com/article"
```

Generate from multiple URLs:
```bash
npm start generate "https://example.com/article1,https://example.com/article2"
```

### Testing Commands

Test Google Docs extraction without generating a post:
```bash
npm start google-doc "https://docs.google.com/document/d/your-doc-id/edit" --debug
```

Test web scraping without generating a post:
```bash
npm start scrape "https://example.com/article" --debug
```

## Customizing the Prompt

Edit `prompt.txt` to customize how the LinkedIn posts are generated. The default prompt creates professional, engaging posts with:

- Hook to grab attention
- Key insights from the article
- Call-to-action
- Relevant hashtags
- Optimal length for LinkedIn

## API Key Setup

Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com/) and either:

1. Set the `ANTHROPIC_API_KEY` environment variable
2. Use the `--api-key` option
3. Add it to your `.env` file

## Google Docs Setup

To use Google Docs with this tool:

1. **Share your document**: Click "Share" in your Google Doc
2. **Set permissions**: Choose "Anyone with the link" and set to "Viewer" 
3. **Copy the URL**: Use the full Google Docs URL (the one you see in your browser)

The tool automatically converts the sharing URL to the export format needed to extract content.

## How It Works

### Google Docs Mode
1. **Content Extraction**: Converts Google Doc to HTML and extracts text, images, and structure
2. **Content Analysis**: Sends the full content (including image information) to Claude
3. **Post Generation**: Claude creates a LinkedIn post based on your prompt template
4. **Output**: Displays the generated post and optionally saves it to a file

### Web Scraping Mode (Legacy)
1. **Scraping**: Extracts title, content, images, and structure from web pages
2. **Content Analysis**: Sends the full content (including image information) to Claude  
3. **Post Generation**: Claude creates a LinkedIn post based on your prompt template
4. **Output**: Displays the generated post and optionally saves it to a file

## Requirements

- Node.js 18+
- Anthropic API key
- Internet connection for scraping and API calls