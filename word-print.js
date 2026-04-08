/**
 * This script prints all characters by category and level 
 * to a JSON file for reference.
 * 
 * node word-print.js
 */

import fs from 'fs';

// --- CONFIGURATION ---
const INPUT_FILE = "./collection/all-words.json";
const OUTPUT_FILE = "./collection/category-words.json";

/**
 * Prints all characters by category and level for reference.
 */
function printWordsByCategory() {

  const json = fs.readFileSync(INPUT_FILE, 'utf8');
  const words = JSON.parse(json);

  // group words by category
  const categorized = {};

  for (const word of words) {
    const key = `${sanitize(word.category)}-${word.level}`;
    if (!categorized[key]) {
      categorized[key] = [];
    }
    categorized[key].push(word);
  }
  const numberOfCategories = Object.keys(categorized).length;

  const categorizedWords = [];

  // Write each group to its own file
  let category = words[0].category;
  let charCount = 0;
  let categoryCount = 0;
  for (const levelCategory of Object.keys(categorized)) {
    if (!levelCategory.startsWith(category)) {
      categorizedWords.push({ 'category': category, 'count': charCount, 'characters': [] });
      let idx = levelCategory.indexOf('-');
      category = levelCategory.substring(0, idx);
      charCount = 0;
      categoryCount++;
      // console.log('category', idx, category, levelCategory);
    }
    const json = categorized[levelCategory];
    const chars = [];
    for (const word of json) {
      // console.log('word', word, word.chinese);
      chars.push(word.chinese);
    }
    categorizedWords.push({ 'category': levelCategory, 'count': chars.length, 'characters': chars });
    charCount += chars.length;
  }
  categorizedWords.push({ 'category': category, 'count': charCount, 'characters': [] });
  categorizedWords.push({ 'categories': categoryCount, 'level categories': numberOfCategories, 'characters': words.length });
  console.log('categories:', categoryCount, 'level categories:', numberOfCategories, 'characters:', words.length);

  const jsonString = JSON.stringify(categorizedWords);
  let printable = jsonString.replaceAll('},{', '},\n{');
  printable = printable.replaceAll(':[]},', ':[]},\n');

  fs.writeFileSync(OUTPUT_FILE, printable);
  console.log('Done!');
}

/**
 * Checks if there are duplicated characters in the words.json
 */
function checkDubplicatedChars() {

  const json = fs.readFileSync(INPUT_FILE, 'utf8');
  const words = JSON.parse(json);
  let found = false;

  for (const word of words) {
    const key = word.chinese;
    const keys = words.filter(w => w.chinese == key);
    if (keys && keys.length > 1) {
      for (const character of keys) {
        console.log(character.chinese);
        found = true;
      }
    }
  }
  console.log('Done!', words.length, (!found ? 'No duplicated characters' : ''));
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

/**
 * Runs the script.
 */
function runScript() {
  if (process.argv.length === 2) {
    console.error('Expected [print | check]');
    process.exit(1);
  }

  const func = process.argv[2];
  switch (func) {
    case 'print':
      printWordsByCategory();
      break;
    case 'check':
      checkDubplicatedChars();
      break;
    default:
      console.error(`Unknown function ${func}, expecting [print | check]`);
  }
}

runScript()
