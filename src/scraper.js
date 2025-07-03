import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export class WebScraper {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async scrapeUrl(url) {
    try {
      console.log(`Scraping: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, header, .ad, .advertisement, .social-share').remove();
      
      const content = this.extractContent($, url);
      
      return content;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  extractContent($, baseUrl) {
    // Try to find the main content area
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main',
      '#content',
      '.main-content'
    ];

    let $content = null;
    for (const selector of contentSelectors) {
      $content = $(selector);
      if ($content.length > 0) break;
    }

    // Fallback to body if no main content found
    if (!$content || $content.length === 0) {
      $content = $('body');
    }

    // Extract title
    const title = $('title').text().trim() || 
                 $('h1').first().text().trim() || 
                 $('[property="og:title"]').attr('content') || '';

    // Extract meta description
    const description = $('meta[name="description"]').attr('content') || 
                       $('[property="og:description"]').attr('content') || '';

    // Extract main text content
    const textContent = this.extractTextContent($content);

    // Extract images
    const images = this.extractImages($content, baseUrl);

    // Extract headings structure
    const headings = this.extractHeadings($content);

    return {
      url: baseUrl,
      title,
      description,
      textContent,
      images,
      headings,
      wordCount: textContent.split(/\s+/).length
    };
  }

  extractTextContent($content) {
    // Remove unwanted elements
    $content.find('script, style, nav, footer, .ad, .social-share, .comments').remove();
    
    let text = '';
    
    // Process paragraphs and headings with proper spacing
    $content.find('p, h1, h2, h3, h4, h5, h6, li, blockquote').each((i, elem) => {
      const elemText = cheerio.load(elem).text().trim();
      if (elemText) {
        text += elemText + '\n\n';
      }
    });

    // Fallback: if no structured content found, get all text
    if (!text.trim()) {
      text = $content.text();
    }

    // Clean up the text
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  extractImages($content, baseUrl) {
    const images = [];
    
    $content.find('img').each((i, elem) => {
      const $img = cheerio.load(elem);
      let src = $img('img').attr('src') || $img('img').attr('data-src') || $img('img').attr('data-lazy-src');
      
      if (src) {
        // Convert relative URLs to absolute
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          src = urlObj.origin + src;
        } else if (!src.startsWith('http')) {
          src = new URL(src, baseUrl).href;
        }

        const alt = $img('img').attr('alt') || '';
        const title = $img('img').attr('title') || '';
        
        images.push({
          src,
          alt,
          title,
          description: alt || title || ''
        });
      }
    });

    return images;
  }

  extractHeadings($content) {
    const headings = [];
    
    $content.find('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const $heading = $content.constructor(elem);
      const text = $heading.text().trim();
      const level = elem.tagName.toLowerCase();
      
      if (text) {
        headings.push({
          level,
          text
        });
      }
    });

    return headings;
  }

  async scrapeMultipleUrls(urls) {
    const results = [];
    
    for (const url of urls) {
      try {
        const content = await this.scrapeUrl(url);
        results.push(content);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error.message);
        results.push({
          url,
          error: error.message
        });
      }
    }
    
    return results;
  }
}