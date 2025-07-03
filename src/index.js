#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { WebScraper } from './scraper.js';
import { GoogleDocsExtractor } from './google-docs.js';
import { LLMPostGenerator } from './llm.js';
import fs from 'fs/promises';

dotenv.config();

const program = new Command();

program
  .name('linkedin-post-creator')
  .description('Generate LinkedIn posts from web articles using AI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a LinkedIn post from URL(s)')
  .argument('<urls>', 'URL or comma-separated URLs to scrape')
  .option('-o, --output <file>', 'Output file to save the generated post')
  .option('-p, --prompt <file>', 'Custom prompt template file (default: ./prompt.txt)')
  .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .option('--debug', 'Show debug information')
  .action(async (urlsArg, options) => {
    try {
      // Parse URLs
      const urls = urlsArg.split(',').map(url => url.trim()).filter(url => url);
      
      if (urls.length === 0) {
        console.error('Error: No valid URLs provided');
        process.exit(1);
      }

      console.log(`Processing ${urls.length} URL(s)...`);
      
      // Initialize LLM generator
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Error: Anthropic API key required. Set ANTHROPIC_API_KEY environment variable or use --api-key option');
        process.exit(1);
      }

      const generator = new LLMPostGenerator(apiKey);
      
      // Load custom prompt if provided
      let customPrompt = null;
      if (options.prompt) {
        try {
          customPrompt = await fs.readFile(options.prompt, 'utf-8');
          console.log(`Using custom prompt from: ${options.prompt}`);
        } catch (error) {
          console.error(`Warning: Could not load custom prompt from ${options.prompt}: ${error.message}`);
        }
      }

      // Generate the post
      console.log('Generating LinkedIn post...');
      const result = await generator.generatePostFromUrls(urls.length === 1 ? urls[0] : urls, customPrompt);
      
      if (!result.success) {
        console.error('Error generating post:', result.error);
        if (options.debug && result.inputContent) {
          console.log('\nDebug - Input content sent to LLM:');
          console.log(result.inputContent);
        }
        process.exit(1);
      }

      // Display the generated post
      console.log('\n' + '='.repeat(60));
      console.log('GENERATED LINKEDIN POST');
      console.log('='.repeat(60));
      console.log(result.post);
      console.log('='.repeat(60));

      // Save to file if requested
      if (options.output) {
        await fs.writeFile(options.output, result.post);
        console.log(`\nPost saved to: ${options.output}`);
      }

      // Show debug info if requested
      if (options.debug) {
        console.log('\nDebug Information:');
        console.log(`Model: ${result.model}`);
        console.log(`Tokens used: ${JSON.stringify(result.tokensUsed)}`);
        console.log(`URLs processed: ${urls.join(', ')}`);
      }

    } catch (error) {
      console.error('Unexpected error:', error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('google-doc')
  .description('Generate a LinkedIn post from Google Doc(s)')
  .argument('<doc-urls>', 'Google Doc URL or comma-separated URLs')
  .option('-o, --output <file>', 'Output file to save the generated post')
  .option('-p, --prompt <file>', 'Custom prompt template file (default: ./prompt.txt)')
  .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .option('--debug', 'Show debug information')
  .action(async (docUrlsArg, options) => {
    try {
      // Parse URLs
      const docUrls = docUrlsArg.split(',').map(url => url.trim()).filter(url => url);
      
      if (docUrls.length === 0) {
        console.error('Error: No valid Google Doc URLs provided');
        process.exit(1);
      }

      // Validate Google Docs URLs
      for (const url of docUrls) {
        if (!url.includes('docs.google.com')) {
          console.error(`Error: "${url}" doesn't appear to be a Google Docs URL`);
          process.exit(1);
        }
      }

      console.log(`Processing ${docUrls.length} Google Doc(s)...`);
      
      // Initialize LLM generator
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Error: Anthropic API key required. Set ANTHROPIC_API_KEY environment variable or use --api-key option');
        process.exit(1);
      }

      const generator = new LLMPostGenerator(apiKey);
      
      // Load custom prompt if provided
      let customPrompt = null;
      if (options.prompt) {
        try {
          customPrompt = await fs.readFile(options.prompt, 'utf-8');
          console.log(`Using custom prompt from: ${options.prompt}`);
        } catch (error) {
          console.error(`Warning: Could not load custom prompt from ${options.prompt}: ${error.message}`);
        }
      }

      // Extract content from Google Docs
      const extractor = new GoogleDocsExtractor();
      let extractedContent;
      
      if (docUrls.length === 1) {
        extractedContent = await extractor.extractContent(docUrls[0]);
      } else {
        extractedContent = await extractor.extractMultipleDocs(docUrls);
      }

      // Generate the post
      console.log('Generating LinkedIn post...');
      const result = await generator.generateLinkedInPost(extractedContent, customPrompt);
      
      if (!result.success) {
        console.error('Error generating post:', result.error);
        if (options.debug && result.inputContent) {
          console.log('\nDebug - Input content sent to LLM:');
          console.log(result.inputContent);
        }
        process.exit(1);
      }

      // Display the generated post
      console.log('\n' + '='.repeat(60));
      console.log('GENERATED LINKEDIN POST');
      console.log('='.repeat(60));
      console.log(result.post);
      console.log('='.repeat(60));

      // Save to file if requested
      if (options.output) {
        await fs.writeFile(options.output, result.post);
        console.log(`\nPost saved to: ${options.output}`);
      }

      // Show debug info if requested
      if (options.debug) {
        console.log('\nDebug Information:');
        console.log(`Model: ${result.model}`);
        console.log(`Tokens used: ${JSON.stringify(result.tokensUsed)}`);
        console.log(`Google Docs processed: ${docUrls.join(', ')}`);
        
        if (Array.isArray(extractedContent)) {
          console.log('Extracted content summary:');
          extractedContent.forEach((content, index) => {
            if (content.error) {
              console.log(`  Doc ${index + 1}: ERROR - ${content.error}`);
            } else {
              console.log(`  Doc ${index + 1}: ${content.title} (${content.wordCount} words, ${content.images.length} images)`);
            }
          });
        } else {
          console.log(`Extracted: ${extractedContent.title} (${extractedContent.wordCount} words, ${extractedContent.images.length} images)`);
        }
      }

    } catch (error) {
      console.error('Error processing Google Doc:', error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('scrape')
  .description('Just scrape URL(s) without generating a post (for testing)')
  .argument('<urls>', 'URL or comma-separated URLs to scrape')
  .option('-o, --output <file>', 'Output file to save the scraped content (JSON format)')
  .option('--debug', 'Show detailed scraping information')
  .action(async (urlsArg, options) => {
    try {
      const urls = urlsArg.split(',').map(url => url.trim()).filter(url => url);
      
      if (urls.length === 0) {
        console.error('Error: No valid URLs provided');
        process.exit(1);
      }

      console.log(`Scraping ${urls.length} URL(s)...`);
      
      const scraper = new WebScraper();
      let results;
      
      if (urls.length === 1) {
        results = await scraper.scrapeUrl(urls[0]);
      } else {
        results = await scraper.scrapeMultipleUrls(urls);
      }

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(results, null, 2));
        console.log(`Scraped content saved to: ${options.output}`);
      }

      if (options.debug) {
        console.log('\nScraped Content:');
        console.log(JSON.stringify(results, null, 2));
      } else {
        // Show summary
        if (Array.isArray(results)) {
          results.forEach((result, index) => {
            if (result.error) {
              console.log(`URL ${index + 1}: ERROR - ${result.error}`);
            } else {
              console.log(`URL ${index + 1}: ${result.title} (${result.wordCount} words, ${result.images.length} images)`);
            }
          });
        } else {
          if (results.error) {
            console.log(`ERROR: ${results.error}`);
          } else {
            console.log(`Scraped: ${results.title} (${results.wordCount} words, ${results.images.length} images)`);
          }
        }
      }

    } catch (error) {
      console.error('Error during scraping:', error.message);
      if (options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();