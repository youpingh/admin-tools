/**
 * This script uses the all-words.json file to create multiple JSON files by
 * category and level. For example, the file Number-1-11.json
 * means the file is for {category: Number, level: 1, index: 11}
 * 
 * node word-categorize.js
 */

import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const WORDS_FILE = "./collection/all-words.json";
const CATEGORY_DIR = './categories';

/**
 * Splits the words.json, which has the entire words selection, into
 * multiple JSON files by category and level {category, level, index}
 */
function categorizeWords() {

  // Read the entire words JSON file
  const json = fs.readFileSync(WORDS_FILE, 'utf8');
  const words = JSON.parse(json);

  // Delete the directory and all its contents recursively
  fs.rmSync(CATEGORY_DIR, { recursive: true, force: true });

  // Re-create the empty directory
  fs.mkdirSync(CATEGORY_DIR, { recursive: true });
  console.log(`Directory is deleted and re-created: ${CATEGORY_DIR}`);

  /**
   * Structure:
   * {
   *   "Family-1-10": [ ...words ],
   *   "Food-2-15": [ ...words ]
   * }
   */
  const categorized = {};

  // Group the words by category and level
  for (const word of words) {
    const key = `${sanitize(word.category)}-${word.level}`;
    if (!categorized[key]) {
      categorized[key] = [];
    }
    categorized[key].push(word);
  }

  const sortedEntries = Object.fromEntries(
    Object.entries(categorized).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  );
  // console.log(sortedEntries);


  // Write each category to its own file
  let wordCount = 0;
  for (const key of Object.keys(sortedEntries)) {
    const fileName = `${key}-${sortedEntries[key].length}.json`;
    const filePath = path.join(CATEGORY_DIR, fileName);
    const categoryWords = sortedEntries[key];
    const sortedWords = categoryWords.sort((a, b) => a.index - b.index);
    const json = JSON.stringify(sortedWords, null, 2);

    fs.writeFileSync(filePath, json, 'utf-8');
    console.log(`Created: ${fileName}`);
    wordCount += sortedEntries[key].length;
  }

  console.log('Done categorization for', wordCount, 'words');
}

/**
 * Optional: sanitize category for safe filenames
 */
function sanitize(name) {
  const newName = name
    .trim()
    .replace(/\s+/g, '-')        // spaces → dashes
    .replace(/[<>:"/\\|?*]/g, ''); // remove illegal filename chars
  // console.log("name:", name, 'new name:', newName);
  return newName;
}

categorizeWords();
