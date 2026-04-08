/**
 * This Node script downloads the entire words, categories, greeting-images and user collections
 * to 4 local JSON files as a backup.
 * The backup files can also be used to upload the collections to the database to refresh it.
 * The downloaded JSON file names are ../assets/data/${collection}.json.
 * Run the script
 * $ node downloadWords.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DATA_FOLDER = '../assets/data';

/**
 * Downloads the words collection to a JSON file
 */
async function downloadWords() {
  const collectionName = 'words';
  const snapshot = await db.collection(collectionName).get();

  const data = [];

  snapshot.forEach((doc) => {
    const word = doc.data();
    data.push({
      level: word.level,
      index: word.index,
      chinese: word.chinese,
      pinyin: word.pinyin,
      phrase: word.phrase,
      sentence: word.sentence,
      english: word.english,
      category: word.category,
      image: word.image
    });
  });

  const filePath = path.join(__dirname, `${DATA_FOLDER}/${collectionName}.json`);

  const sortedData = data.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }

    return a.level - b.level;
  });

  const dataString = JSON.stringify(sortedData);
  const formatedString = dataString.replaceAll('},{', '},\n{');
  fs.writeFileSync(filePath, formatedString);
  // fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ Exported ${DATA_FOLDER}/words (${data.length} docs)`);
}

/**
 * Downloads the categories collection to a JSON file
 */
async function downloadCategories() {
  const collectionName = 'categories';
  const snapshot = await db.collection(collectionName).get();

  const data = [];

  snapshot.forEach((doc) => {
    const category = doc.data();
    data.push({
      category: category.category,
      cname: category.cname,
      sequence: category.sequence
    });
  });

  const filePath = path.join(__dirname, `${DATA_FOLDER}/${collectionName}.json`);

  const sortedData = data.sort((a, b) => {
    return a.sequence - b.sequence;
  });

  const dataString = JSON.stringify(sortedData);
  const formatedString = dataString.replaceAll('},{', '},\n{');
  fs.writeFileSync(filePath, formatedString);

  console.log(`✅ Exported ${DATA_FOLDER}/categories (${data.length} docs)`);
}

/**
 * Downloads the users collection to a JSON file
 */
async function downloadUsers() {
  const collectionName = 'users';
  const snapshot = await db.collection('users').get();

  const data = [];

  snapshot.forEach((doc) => {
    const user = doc.data();
    data.push({
      email: user.email,
      allowed: user.allowed,
      level: user.level,
      role: user.role,
      name: user.name
    });
  });

  const filePath = path.join(__dirname, `${DATA_FOLDER}/${collectionName}.json`);
  const dataString = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, dataString);

  console.log(`✅ Exported ${DATA_FOLDER}/${collectionName} (${data.length} docs)`);
}

/**
 * Downloads the greeting-images collection to a JSON file
 */
async function downloadGreetingImages() {
  const collectionName = 'greeting-images';
  const snapshot = await db.collection(collectionName).get();

  const data = [];

  snapshot.forEach((doc) => {
    const image = doc.data();
    data.push({
      category: image.category,
      wrong: image.wrong,
      ok: image.ok,
      icon: image.icon,
      great: image.great
    });
  });

  const filePath = path.join(__dirname, `${DATA_FOLDER}/${collectionName}.json`);
  const sortedData = data.sort((a, b) => {
      return a.category.localeCompare(b.category);
  });
  const dataString = JSON.stringify(sortedData, null, 2);
  fs.writeFileSync(filePath, dataString);

  console.log(`✅ Exported ${DATA_FOLDER}/${collectionName} (${data.length} docs)`);
}

async function exportAll() {
  try {
    await downloadWords();
    await downloadCategories();
    await downloadUsers();
    await downloadGreetingImages();

    console.log('\n🎉 All collections exported successfully.');
    process.exit();
  } catch (error) {
    console.error('❌ Error exporting collections:', error);
    process.exit(1);
  }
}

exportAll();
