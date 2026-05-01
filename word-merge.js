/**
 * This script merges all the category-x-y.json files in the categories folder into
 * one JSON file that has the entire words collection.
 * 
 * 1 - the english field is in lower case,
 * 2 - the pinyin field is in title case,
 * 3 - the grammar field matches the semantic category,
 * 4 - update the image path name as the category might have been changed,
 * 5 - update the index field by category and level of each word. (optional)
 * 6 - add the new field 'definition' to the all-words.json (optional)
 * 
 * node word-merge.js
 */

import fs from 'fs';

const CATEGORY_DIR = './categories/';
const WORDS_FILE = './collection/all-words.json';
const DICTIONARY_FILE = './collection/definitions.json';

const GrammaticalCategories = [
  { "grammar": "Noun", "categories": ["Nature", "Animal", 'Bird', "Plant", "Family", 'Clothes', "Body", 'Fish', 'Insect', "People", "Health", "Occupations", "Sports", "Food", "Clothing", 'Stationery', 'Tableware', "Home", "Vehicle", "Culture", "Vegetable", "Fruit", "Furniture", "Number", "DateTime", "Color", "Direction", "Money", "Shape", "Building", "Metal", "Place", "Tool", "School", 'Toiletry', 'Toy', "Weapon"] },
  { "grammar": "Verb", "categories": ["Movement", "Emotion", "Activity", "Mental", "Communication", "Causative", "Existence", "Motion", "Possession"] },
  { "grammar": "Adjective", "categories": ["Quantity", "Quality", "MeasureWord", "SetDenoting", "Relational", "Evaluative", "Quantitative", "Stative"] },
  { "grammar": "Adverb", "categories": ["Manner", "Time", "Frequency", "Degree", "Certainty", "Linking", "Negation"] }
]

const FunctionalCategories = [
  "Time", "Certainty", "Conjunction", "MeasureWord", "Negation", "Particle", "Preposition", "Pronoun"
]

let dictionaryWords;
let missedDef = [];

async function mergeWordFiles() {

  const allWords = [];
  console.log(`Starting merging categorized words ...`);

  // dictionaryWords = JSON.parse(fs.readFileSync(DICTIONARY_FILE, 'utf8'));
  // console.log(`Starting merging categorized words with ${dictionaryWords.length} dictionary entries`);

  try {
    const files = fs.readdirSync(CATEGORY_DIR);

    files.forEach(file => {
      const fileName = CATEGORY_DIR + file;
      const categorizedWords = JSON.parse(fs.readFileSync(fileName, 'utf8'));
      if (categorizedWords && categorizedWords.length > 0) {
        for (const word of categorizedWords) {
          const grammar = getGrammaticalCategory(word.category);
          const imgPath = getImagePath(word);
          const definition = getDefinition(word);
          const newWord = {
            level: word.level,
            index: word.index,
            category: word.category,
            grammar: grammar,
            chinese: word.chinese,
            english: word.english.toLowerCase(),
            pinyin: toTitleCase(word.pinyin.toLowerCase()),
            definition: definition,
            phrase: word.phrase,
            sentence: word.sentence,
            image: imgPath
          }
          allWords.push(newWord);
          // console.log(`new word ${newWord.chinese}, ${newWord.definition}`);
        }
      }
      console.log(file, categorizedWords.length);
    });
  } catch (err) {
    console.log('Unable to scan directory:', err);
  }

  const sortedWords = allWords.sort((a, b) => {
    return a.category.localeCompare(b.category);
  });

  // setIndies(sortedWords);
  fs.writeFileSync(WORDS_FILE, JSON.stringify(sortedWords, null, 2));
  console.log(sortedWords.length, ` words are merged into ${WORDS_FILE}`);
  if (missedDef.length > 0) {
    console.log('Missed definitions\n', missedDef.toString());
  }
}

function toTitleCase(word) {
  let newWord = word;
  if (word && word.length > 1) {
    newWord = (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return newWord;
}

function getGrammaticalCategory(category) {
  let grammar = category;
  let found = false;
  for (const grammarCategory of GrammaticalCategories) {
    if (!found) {
      if (grammarCategory.categories.find(c => c == category)) {
        grammar = grammarCategory.grammar;
        found = true;
      }
    }
  }
  // console.log(category, grammar);
  return grammar;
}

function getImagePath(word) {
  let imgPath = `${word.category}/${word.chinese}.png`;
  if (FunctionalCategories.includes(word.category)) {
    imgPath = `Functional/${word.category}.png`
  }
  return imgPath;
}

function getDefinition(word) {
  return word.definition;
  // const entry = dictionaryWords.find(d => d.chinese == word.chinese);
  // if (entry) {
  //   return entry.definition;
  // } else {
  //   console.log(`The definition of the character ${word.chinese} not found`);
  //   missedDef.push(word.chinese);
  //   return word.definition;
  // }
}

function setIndies(words) {

  // re-count the index numbers of each category and level
  const counters = [];
  for (const word of words) {
    const category = word.category;
    const level = word.level;
    let counter = counters.find(c => c.category == category && c.level == level);
    if (counter) {
      counter.index++;
    } else {
      counter = { 'category': category, 'level': level, 'index': 1 };
      counters.push(counter);
    }
    word.index = counter.index
  }
}

mergeWordFiles()
