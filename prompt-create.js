
/**
 * This script creates an image generation prompt file (.jsonl) for each category that is used by image-batch.js. 
 * It is totally unrelated to the final words.json. So the image generation is an individual process. 
 * The generated images will be used to KLC app finally.
 *
 * Usage: node prompt-create.js
 */
const inputPromptDir = './json-prompts';
const jsonlPromptDir = './prompts';
const wordsFile = './collection/all-words.json';

import fs from 'fs';
import { buildPrompt } from './prompt-builder.js';

/**
 * Creates an image generation prompt file (.jsonl) for each category of words at the specified level. 
 */
function createPrompts(level) {

  // Re-create an empty directory for the generated JSONL files
  fs.rmSync(jsonlPromptDir, { recursive: true, force: true });
  fs.mkdirSync(jsonlPromptDir, { recursive: true });
  console.log(`Directory is deleted and re-created: ${jsonlPromptDir}`);

  const jsonWords = fs.readFileSync(wordsFile, 'utf8');
  const allWords = JSON.parse(jsonWords);
  const levelWords = allWords.filter(w => w.level == level);
  if (!levelWords || levelWords.length == 0) {
    console.error("No words at this level:", level);
    return;
  }
  console.log(`There are ${levelWords.length} characters at level ${level}`);

  try {
    const files = fs.readdirSync(inputPromptDir);
    files.forEach(file => {
      const jsonFile = inputPromptDir + '/' + file;
      const chars = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      const category = chars[0].category;
      const words = allWords.filter(w => w.category == category && w.level == level);
      const categoryWords = (words ? words.length : 0);
      // console.log('Processing:', jsonFile, chars.length);

      const descs = [];
      for (const char of chars) {
        if (levelWords.find(w => w.chinese == char.character)) {
          const id = char.category + "-" + char.character;
          const promptText = buildPrompt(char);
          const promptDesc = createPromptDesc(id, promptText);
          descs.push(promptDesc);
          // console.log('id:', id);
        }
      }

      if (descs.length > 0) {
        const filename = file.replace('.json', '.jsonl');
        const jsonlFile = jsonlPromptDir + '/' + filename;
        let jsonl = JSON.stringify(descs);
        jsonl = jsonl.substring(1, jsonl.length - 1);
        jsonl = jsonl.replaceAll('}}},{', '}}}\n{');

        fs.writeFileSync(jsonlFile, jsonl, 'utf-8');
        console.log('file, chars, categoryWords, prompts:', filename, chars.length, categoryWords, descs.length);
      }
    })
  }
  catch (error) {
    console.error('Processing failed', error);
  }
}

/**
 * Creates an image generation description required by Google Batch Image Generation API
 * @param {*} id 
 * @param {*} promptText 
 * @returns 
 */
function createPromptDesc(id, promptText) {
  const desc = {
    "custom_id": id,
    "request": {
      "contents": [
        {
          "parts": [
            { "text": promptText }]
        }
      ],
      "generation_config":
        { "response_modalities": ["IMAGE"] }
    }
  }
  return desc;
};

/**
 * Runs create prompts script.
 */
function runScript() {
  if (process.argv.length != 3) {
    console.error('Expected a level [1-7]');
    process.exit(1);
  }

  const level = process.argv[2];
  createPrompts(level);
}

runScript()
