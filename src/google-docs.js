import axios from 'axios';
import * as cheerio from 'cheerio';

export class GoogleDocsExtractor {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  convertToExportUrl(docUrl) {
    // Handle different Google Docs URL formats
    let docId;
    
    // Extract document ID from various URL formats
    const patterns = [
      /\/document\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/presentation\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/
    ];

    for (const pattern of patterns) {
      const match = docUrl.match(pattern);
      if (match) {
        docId = match[1];
        break;
      }
    }

    if (!docId) {
      throw new Error('Could not extract document ID from URL. Make sure it\'s a valid Google Docs URL.');
    }

    // Convert to HTML export URL
    return `https://docs.google.com/document/d/${docId}/export?format=html`;
  }

  async extractContent(docUrl) {
    try {
      console.log(`Extracting content from Google Doc: ${docUrl}`);
      
      const exportUrl = this.convertToExportUrl(docUrl);
      console.log(`Using export URL: ${exportUrl}`);
      
      const response = await axios.get(exportUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Extract title from the document
      const title = $('title').text().trim() || 'Google Doc Content';
      
      // Extract all text content
      const textContent = this.extractTextContent($);
      
      // Extract images
      const images = this.extractImages($, docUrl);
      
      // Extract headings structure  
      const headings = this.extractHeadings($);

      return {
        url: docUrl,
        exportUrl,
        title,
        textContent,
        images,
        headings,
        wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
        type: 'google-doc'
      };

    } catch (error) {
      if (error.response && error.response.status === 403) {
        throw new Error('Document is not publicly accessible. Please make sure the document is shared with "Anyone with the link" and has view permissions.');
      } else if (error.response && error.response.status === 404) {
        throw new Error('Document not found. Please check the URL is correct and the document exists.');
      } else {
        console.error(`Error extracting from Google Doc:`, error.message);
        throw new Error(`Failed to extract content: ${error.message}`);
      }
    }
  }

  extractTextContent($) {
    let text = '';
    
    // Google Docs HTML structure - get content from body
    const $body = $('body');
    
    // Remove script and style elements
    $body.find('script, style').remove();
    
    // Process paragraphs and other text elements
    $body.find('p, h1, h2, h3, h4, h5, h6, li, div').each((i, elem) => {
      const $elem = $(elem);
      const elemText = $elem.text().trim();
      
      // Skip empty elements
      if (elemText && elemText.length > 0) {
        // Check if it's a heading or important element
        const tagName = elem.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          text += `\n${elemText}\n`;
        } else {
          text += `${elemText}\n`;
        }
      }
    });

    // If no structured content found, get all text
    if (!text.trim()) {
      text = $body.text();
    }

    // Clean up the text
    return text
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')    // Replace multiple newlines with double newline
      .trim();
  }

  extractImages($, docUrl) {
    const images = [];
    
    $('img').each((i, elem) => {
      const $img = $(elem);
      let src = $img.attr('src');
      
      if (src) {
        // Google Docs images are usually already full URLs
        // But handle relative URLs just in case
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (!src.startsWith('http')) {
          // For Google Docs, this is unlikely but handle it
          if (src.startsWith('/')) {
            src = 'https://docs.google.com' + src;
          }
        }

        const alt = $img.attr('alt') || '';
        const title = $img.attr('title') || '';
        const width = $img.attr('width') || '';
        const height = $img.attr('height') || '';
        
        images.push({
          src,
          alt,
          title,
          width,
          height,
          description: alt || title || `Image ${i + 1} from Google Doc`
        });
      }
    });

    return images;
  }

  extractHeadings($) {
    const headings = [];
    
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const $heading = $(elem);
      const text = $heading.text().trim();
      const level = elem.tagName.toLowerCase();
      
      if (text && text.length > 0) {
        headings.push({
          level,
          text
        });
      }
    });

    return headings;
  }

  async extractMultipleDocs(docUrls) {
    const results = [];
    
    for (const docUrl of docUrls) {
      try {
        const content = await this.extractContent(docUrl);
        results.push(content);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to extract from ${docUrl}:`, error.message);
        results.push({
          url: docUrl,
          error: error.message,
          type: 'google-doc'
        });
      }
    }
    
    return results;
  }
}