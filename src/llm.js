import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class LLMPostGenerator {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  async loadPromptTemplate(promptPath = './prompt.txt') {
    try {
      const promptContent = await fs.readFile(promptPath, 'utf-8');
      return promptContent.trim();
    } catch (error) {
      console.error('Error loading prompt template:', error.message);
      // Fallback prompt if file doesn't exist
      return this.getDefaultPrompt();
    }
  }

  getDefaultPrompt() {
    return `You are an expert LinkedIn content creator. Based on the provided article content and images, create an engaging LinkedIn post that:

1. Captures the key insights and main points from the article
2. Uses a professional yet conversational tone
3. Includes relevant hashtags (3-5 maximum)
4. Keeps the post length optimal for LinkedIn engagement (150-300 words)
5. Starts with a hook to grab attention
6. Includes a call-to-action or question to encourage engagement
7. Mentions any images that should accompany the post

Format the response as:
POST CONTENT:
[Your LinkedIn post here]

SUGGESTED IMAGES:
[List any images from the article that should be included]

HASHTAGS:
[Relevant hashtags]`;
  }

  formatContentForLLM(scrapedContent) {
    let formattedContent = `ARTICLE ANALYSIS REQUEST\n\n`;
    
    if (Array.isArray(scrapedContent)) {
      // Multiple URLs
      formattedContent += `MULTIPLE ARTICLES:\n\n`;
      scrapedContent.forEach((content, index) => {
        if (content.error) {
          formattedContent += `Article ${index + 1} - ERROR: ${content.error}\n\n`;
          return;
        }
        
        formattedContent += `Article ${index + 1}:\n`;
        formattedContent += `URL: ${content.url}\n`;
        formattedContent += `Title: ${content.title}\n`;
        if (content.description) {
          formattedContent += `Description: ${content.description}\n`;
        }
        formattedContent += `Word Count: ${content.wordCount}\n\n`;
        
        if (content.headings.length > 0) {
          formattedContent += `HEADINGS:\n`;
          content.headings.forEach(heading => {
            formattedContent += `${heading.level.toUpperCase()}: ${heading.text}\n`;
          });
          formattedContent += `\n`;
        }
        
        formattedContent += `CONTENT:\n${content.textContent}\n\n`;
        
        if (content.images.length > 0) {
          formattedContent += `IMAGES:\n`;
          content.images.forEach((img, imgIndex) => {
            formattedContent += `Image ${imgIndex + 1}:\n`;
            formattedContent += `- URL: ${img.src}\n`;
            if (img.alt) formattedContent += `- Alt text: ${img.alt}\n`;
            if (img.title) formattedContent += `- Title: ${img.title}\n`;
            formattedContent += `\n`;
          });
        }
        
        formattedContent += `\n---\n\n`;
      });
    } else {
      // Single URL
      if (scrapedContent.error) {
        formattedContent += `ERROR: ${scrapedContent.error}\n\n`;
        return formattedContent;
      }
      
      formattedContent += `ARTICLE DETAILS:\n`;
      formattedContent += `URL: ${scrapedContent.url}\n`;
      formattedContent += `Title: ${scrapedContent.title}\n`;
      if (scrapedContent.description) {
        formattedContent += `Description: ${scrapedContent.description}\n`;
      }
      formattedContent += `Word Count: ${scrapedContent.wordCount}\n\n`;
      
      if (scrapedContent.headings.length > 0) {
        formattedContent += `HEADINGS:\n`;
        scrapedContent.headings.forEach(heading => {
          formattedContent += `${heading.level.toUpperCase()}: ${heading.text}\n`;
        });
        formattedContent += `\n`;
      }
      
      formattedContent += `CONTENT:\n${scrapedContent.textContent}\n\n`;
      
      if (scrapedContent.images.length > 0) {
        formattedContent += `IMAGES:\n`;
        scrapedContent.images.forEach((img, imgIndex) => {
          formattedContent += `Image ${imgIndex + 1}:\n`;
          formattedContent += `- URL: ${img.src}\n`;
          if (img.alt) formattedContent += `- Alt text: ${img.alt}\n`;
          if (img.title) formattedContent += `- Title: ${img.title}\n`;
          formattedContent += `\n`;
        });
      }
    }
    
    return formattedContent;
  }

  async generateLinkedInPost(scrapedContent, customPrompt = null) {
    try {
      const promptTemplate = customPrompt || await this.loadPromptTemplate();
      const formattedContent = this.formatContentForLLM(scrapedContent);
      
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `${promptTemplate}\n\n${formattedContent}`
          }
        ]
      });

      const response = message.content[0].text;
      
      return {
        success: true,
        post: response,
        inputContent: formattedContent,
        model: this.model,
        tokensUsed: message.usage
      };
    } catch (error) {
      console.error('Error generating LinkedIn post:', error.message);
      return {
        success: false,
        error: error.message,
        inputContent: this.formatContentForLLM(scrapedContent)
      };
    }
  }

  async generatePostFromUrls(urls, customPrompt = null) {
    const { WebScraper } = await import('./scraper.js');
    const scraper = new WebScraper();
    
    let scrapedContent;
    if (Array.isArray(urls)) {
      scrapedContent = await scraper.scrapeMultipleUrls(urls);
    } else {
      scrapedContent = await scraper.scrapeUrl(urls);
    }
    
    return await this.generateLinkedInPost(scrapedContent, customPrompt);
  }
}