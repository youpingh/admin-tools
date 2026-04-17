/**
 * This script calls Gemini AI to get the definitions of all the characters and
 * some phrases the consist of the characters. 
 * 
 * node word-phrases.js
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import 'dotenv/config';

const INPUT_FILE = "./collection/all-words.json";
const OUTPUT_FILE = "./collection/dictionary-master.json";
const LOG_FILE = "./work/failed-phrase-batches.log";
const WAIT_TIME = 5 * 1000; // the time interval for polling the batch job status

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({
  model: "gemini-2.5-flash",
  // This ensures the AI stays in "Chinese Teacher" mode for every batch
  systemInstruction: "You are a professional Chinese language teacher. All definitions and phrases MUST be written in Simplified Chinese. Do not use English in your response."
});

async function processBatch(chars) {

  const prompt = `Act as a professional Chinese lexicographer. For each character in this list: [${chars.join(', ')}], generate a single-line JSON object.
                  Format: {"chinese": "字", "definition": ["..."], "phrases": ["..."]}
                  Requirements:
                  1. Phrases: Exactly 30 high-frequency words or idioms.
                  2. Variety: Ensure the character appears at the START, MIDDLE, and END of different phrases.
                  3. Idioms: Include at least 3 four-character idioms (成语) per character.
                  4. Output: ONLY the JSON lines, no markdown blocks or extra text.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function run() {

  // Read the entire words JSON file and make a character array
  const json = fs.readFileSync(INPUT_FILE, 'utf8');
  const words = JSON.parse(json);
  const allChars = [];
  for (const word of words) {
    allChars.push(word.chinese);
  }

  // Smaller batches ensure the AI doesn't "forget" the 30-phrase rule
  const batchSize = 10;
  let finalOutput = [];

  for (let i = 0; i < allChars.length; i += batchSize) {
    const batch = allChars.slice(i, i + batchSize);
    console.log(`Processing characters ${i} to ${i + batchSize} - ${batch}...`);

    try {
      let jsonStrings = await processBatch(batch);
      jsonStrings = jsonStrings.replaceAll(']}', ']},');
      fs.appendFileSync(OUTPUT_FILE, jsonStrings + "\n");
    } catch (e) {
      console.error(`Error on batch starting at ${i}:`, e);
      // Log failures to a separate file so you can re-run just those later
      fs.appendFileSync(LOG_FILE, `Failed processing ${batch} ${e}\n`);
    }
    console.log(`Waiting for ${WAIT_TIME/1000} seconds to respect rate limits ...`);
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
  }
}

run();

// const prompt = `
//     For each of the following Chinese characters: ${chars.join(', ')}
//     Generate a JSON object in this exact format (one line per object):
//     {"chinese": "char", "definition": ["def1", "def2"], "phrases": ["phrase1", "phrase2", ...]}

//     Rules:
//     - Definitions: Up to 3 entries in Simplified Chinese.
//     - Phrases: Exactly 30 phrases/idioms per character.
//     - Phrase position: The character should appear in various positions (start, middle, end).
//     - No extra text, just the JSON lines.
// `;

// const prompt = `
//       Target Characters: ${chars.join(', ')}

//       Task: For each character, generate a single-line JSON object.
//       Requirements:
//       - "definition": Exactly 2-3 definitions in Simplified Chinese (简体中文).
//       - "phrases": Exactly 30 unique words or idioms where the character appears at the start, middle, or end.
//       - Format: {"chinese": "字", "definition": ["定义1", "定义2"], "phrases": ["词语1", "词语2", ...]}

//       Constraint: NO ENGLISH. Every string must be in Simplified Chinese.
//   `;
