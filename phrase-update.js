/**
 * This script creates phrase objects collection from the AI-generated phrases.
 * 
 * node phrase-update.js [create | filter | update]
 */

import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const GENERATED_DICTIONARY = "./collection/dictionary-master.json"; // generated with many invalid phrases
const GENERATED_PHRASES = "./collection/all-generated-phrases.json"; // re-generated valid phrases
const VALID_IDIOMS = "./collection/valid-idioms.json"; // verified 3-4 idioms
const PHRASE_OBJECTS = './collection/phrases.json'; // the final phrase objects collection
// const IS_IDIOM = './collection/isIdiom.json';

const UPDATED_DICTIONARY = "./collection/dictionary-updated.json";
const TEXT_FILE = './collection/phrase-to-check.txt';

let origItems;
let newItems;
let validIdioms;

//   {
//   "phrase": "天地",
//   "characters": ["天", "地"],
//   "length": 2,
//   "quality": "high",
//   "source": "ai_generated",
//   "review_status": "reviewed"
// }

/**
 * Updates the AI generated JSON file with newly generated and validated phrases.
 */
function updateDictionary() {

  // Read the 1st and 2nd AI-generated phrases JSON files and validated phrases JSON file
  const jsonOrig = fs.readFileSync(GENERATED_DICTIONARY, 'utf8');
  const jsonNew = fs.readFileSync(GENERATED_PHRASES, 'utf8');
  const jsonIdioms = fs.readFileSync(VALID_IDIOMS, 'utf8');
  origItems = JSON.parse(jsonOrig);
  newItems = JSON.parse(jsonNew);
  validIdioms = JSON.parse(jsonIdioms);

  // create updated dictionary objects
  const updatedItems = [];

  // items don't have enough phrases
  const phrasesToCheck = [];

  // use the newly generated phrases and all the valid 3-4 character phrases
  // {"chinese": "", "definition": [], "phrases": []},
  for (const item of origItems) {
    const key = item.chinese;
    const updatedItem = {
      chinese: item.chinese,
      definition: item.definition,
      phrases: getPhrases(key)
    }

    const itemPhrases = item.phrases;
    for (let phrase of itemPhrases) {
      phrase = phrase.trim();
      const valid = checkPhraseStatus(key, phrase);
      if (valid) {
        updatedItem.phrases.push(phrase);
      }
    }
    updatedItems.push(updatedItem);
    if (updatedItem.phrases.length < 15) {
      let textItem = structuredClone(updatedItem);
      textItem.phrases = [`${updatedItem.phrases.length}`];
      phrasesToCheck.push(textItem);
    }
  }

  // create the updated dictionary JSON
  const jsonOut = JSON.stringify(updatedItems);
  const jsonString = jsonOut.replaceAll('},{', '},\n{');
  fs.writeFileSync(UPDATED_DICTIONARY, jsonString, 'utf-8');
  console.log('The original dictionary is updated:', UPDATED_DICTIONARY);

  // create a text file for the short items
  const textOut = JSON.stringify(phrasesToCheck);
  const textString = textOut.replaceAll('},{', '},\n{');
  fs.writeFileSync(TEXT_FILE, textString, 'utf-8');
  console.log('Phrase to check file is created:', TEXT_FILE);
}

/**
 * Checks if the phrase is a validated 3-4 character phrase.
 * @param {*} key 
 * @param {*} phrase 
 * @returns 
 */
function checkPhraseStatus(key, phrase) {

  if (phrase.length < 3) return false;

  // check if it is an validated 3-4 character phrase
  // check if it exists in the newly generated items.
  let isValid = false;
  let item = validIdioms.find(item => item.phrase == phrase);
  if (item && item.valid) {
    isValid = true;
    item = newItems.find(i => i.chinese == key);
    if (item) {
      const existPhrase = item.phrases.find(p => p == phrase);
      isValid = (existPhrase ? false : true);
    }
  }
  return isValid;
}

/**
 * Get the newly generated phrases of the character.
 * @param {*} chinese 
 * @returns 
 */
function getPhrases(chinese) {
  const phrases = [];
  const items = newItems.filter(item => item.chinese == chinese);
  for (const item of items) {
    phrases.push(...item.phrases);
  }
  // remove duplicates
  const uniquePhrases = [...new Set(phrases)];
  return uniquePhrases;
}

/**
 * Creates phrase objects from the generated phrase JSON file.
 */
function createPhrases() {

  // Read the AI-generated phrases JSON file
  const json = fs.readFileSync(UPDATED_DICTIONARY, 'utf8');
  const items = JSON.parse(json);

  // create phrase objects
  const phrases = [];
  // const phrasesToCheck = [];
  // let checkCount = 0;
  for (const item of items) {
    const itemPhrases = item.phrases;
    // console.log('phrases:', itemPhrases);
    for (let phrase of itemPhrases) {
      phrase = phrase.trim();
      const dup = phrases.find(p => p.phrase == phrase);
      if (!dup) {
        const characters = [...phrase];
        const status = setStatus(phrase);
        if (status == 'no') {
          console.log('status is no:', phrase);
        } else {
          phrases.push({
            phrase: phrase,
            characters: characters,
            length: characters.length,
            quality: "high",
            source: "ai_generated",
            status: status
          });
        }
        // if (phrase.length < 3) {
        //   checkCount++;
        //   if (checkCount == 50) {
        //     checkCount = 0;
        //     phrasesToCheck.push(phrase + '<br>');
        //   } else {
        //     phrasesToCheck.push(phrase);
        //   }
        // }
      }
    }
  }

  // Create the phrase file
  const sortedData = phrases.sort((a, b) => {
    const length1 = a.phrase.length;
    const length2 = b.phrase.length;
    return length1 - length2;
    // return a.phrase.localeCompare(b.phrase);
  });

  const jsonOut = JSON.stringify(sortedData);
  const jsonString = jsonOut.replaceAll('},{', '},\n{');
  fs.writeFileSync(PHRASE_OBJECTS, jsonString, 'utf-8');
  console.log('The phrases JSON file is created:', PHRASE_OBJECTS);

  // let textString = phrasesToCheck.toString();
  // textString = textString.replaceAll('<br>,', ',\n');
  // fs.writeFileSync(TEXT_FILE, textString, 'utf-8');
}

/**
 * Removes the reviewed phrases from the generated phrase JSON file.
 */
function filterPhrases() {
  console.log('Do nothing here');

  // Read the reviewed phrases JSON file
  // const phraseJson = fs.readFileSync(IS_IDIOM, 'utf8');
  // const phrases = JSON.parse(phraseJson);
  // const reviewedPhrases = phrases.filter(p => p.isIdiom === false);

  // const phraseJson = fs.readFileSync(PHRASE_OBJECTS, 'utf8');
  // const phrases = JSON.parse(phraseJson);
  // const reviewedPhrases = phrases.filter(p => p.status != 'reviewed');

  // // Read the AI-generated phrases JSON file
  // let genJson = fs.readFileSync(GENERATED_DICTIONARY, 'utf8');

  // // Remove reviewed phrases
  // for (const phrase of reviewedPhrases) {
  //   const removed1 = `"${phrase.phrase}", `;
  //   const removed2 = `, "${phrase.phrase}"]`;
  //   genJson = genJson.replaceAll(removed1, '');
  //   genJson = genJson.replaceAll(removed2, ']');
  // }
  // genJson = genJson.replaceAll(', ,', ',');

  // // Create the phrase file
  // fs.writeFileSync(UPDATED_DICTIONARY, genJson, 'utf-8');
  // console.log('The original dictionary is filtered:', reviewedPhrases.length);
}

function setStatus(phrase) {
  let status = (phrase.length > 4 || phrase.length < 2 ? 'no' : 'reviewed');
  if (status === 'reviewed') {
    if (phrase.endsWith('啊') || phrase.endsWith('唷') ||
      phrase.endsWith('呵') || phrase.endsWith('嘿') ||
      phrase.endsWith('啦') || phrase.endsWith('哎') ||
      phrase.endsWith('哟') || phrase.endsWith('嗯') ||
      phrase.endsWith('嗨') || phrase.endsWith('咧') ||
      phrase.endsWith('哦') || phrase.endsWith('哇')) {
      status = 'no';
    }
  }
  return status;
}

/**
 * Runs phrase script.
 */
function runScript() {
  if (process.argv.length != 3) {
    console.error('Expected a command [create | filter | update]');
    process.exit(1);
  }

  const command = process.argv[2];
  if (command == 'create') {
    createPhrases();
  } else if (command == 'filter') {
    filterPhrases();
  } else if (command == 'update') {
    updateDictionary();
  } else {
    console.error('Expected a command [create | filter | update]');
  }
}

runScript()
