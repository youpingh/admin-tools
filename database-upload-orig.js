/**
 * This Node script uploads the entire words, categories, phrases, greeting-images and user collections
 * from a JSON data file.

 * Run the script
 * $ node database-upload.js [user | category | word | phrase | image]
 */
import admin from 'firebase-admin';
import fs from 'fs';

// 🔥 Initialize Admin SDK
const serviceAccount = JSON.parse(
  fs.readFileSync('./serviceAccountKey.json', 'utf-8')
);

// 🔥 Initialize (you said this is already set up)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔥 IMPORTANT: prevent hanging issues
db.settings({ preferRest: true });

// CONFIG
const COLLECTION_PHRASES = 'phrases';
const COLLECTION_WORDS = 'words';
const COLLECTION_CATEGORIES = 'categories';
const COLLECTION_IMAGES = 'greeting-images';
const COLLECTION_USERS = 'users';

const JSON_DIR = './upload';
const JSON_PHRASES = `${JSON_DIR}/phrases.json`;
const JSON_WORDS = `${JSON_DIR}/words.json`;
const JSON_CATEGORIES = `${JSON_DIR}/categories.json`;
const JSON_IMAGES = `${JSON_DIR}/greeting-images.json`;
const JSON_USERS = `${JSON_DIR}/users.json`;

// Optional tuning
const BATCH_SIZE = 200;     // safer than 500
const DELAY_MS = 400;       // small delay between batches
const COMMIT_TIMEOUT = 20000;
const START_INDEX = 0;   // change if you need to resume

// Uploads users
async function uploadUsers() {
  console.log('Start uploading users ...');
  const users = await loadJSON(JSON_USERS);

  for (const user of users) {
    const ref = db.collection(COLLECTION_USERS).doc(user.email);
    await ref.set(user);
  }

  console.log('Users imported:', users.length);
}

// Uploads greeting images
async function uploadGreetingImages() {
  console.log('Start uploading images ...');
  const images = await loadJSON(JSON_IMAGES);

  for (const image of images) {
    const ref = db.collection(COLLECTION_IMAGES).doc(image.category);
    await ref.set(image);
  }

  console.log('Greeting images imported:', images.length);
}

// Uploads categories
async function uploadCategories() {
  console.log('Start uploading categories ...');
  const categories = await loadJSON(JSON_CATEGORIES);

  for (const category of categories) {
    const ref = db.collection(COLLECTION_CATEGORIES).doc(category.category);
    await ref.set(category);
  }

  console.log('Categories imported:', categories.length);
}

// Uploads phrases
async function uploadPhrases(start) {
  console.log('Start uploading phrases ...');

  const phrases = loadJSON(JSON_PHRASES);
  const num = phrases.length - start;
  console.log(`Loaded ${phrases.length} phrases from file`);

  let batch = db.batch();
  let batchSize = 0;
  let count = 0;
  let batchNumber = 0;

  // for (const item of phrases) {
  console.log(`Loading ${phrases.length} - ${start} = ${num} phrases`);
  for (let i = start; i < phrases.length; i++) {
    const item = phrases[i];
    if (!item.phrase) continue;

    // ✅ Use phrase as doc ID (deduplicate)
    const ref = db.collection(COLLECTION_PHRASES).doc(item.phrase);

    batch.set(ref, item);
    batchSize++;
    count++;

    if (batchSize === BATCH_SIZE) {
      batchNumber++;

      console.log(`➡️ Committing batch #${batchNumber} at count ${count}`);

      try {
        await safeCommit(batch);
      }
      catch (error) {
        return;
      }

      console.log(`✅ Batch #${batchNumber} committed`);

      await sleep(DELAY_MS);

      batch = db.batch();
      batchSize = 0;
    }
  }
  // Final batch
  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`✅ Upload complete: ${count} phrases`);
}


// Uploads words
async function uploadWords() {
  console.log('Start uploading words ...');

  const words = loadJSON(JSON_WORDS);
  console.log(`Loaded ${words.length} words from file`);

  let batch = db.batch();
  let batchSize = 0;
  let count = 0;

  for (const item of words) {
    if (!item.chinese) continue;
    // console.log(`Uploading ${item.chinese}`);

    // ✅ Use phrase as doc ID (deduplicate)
    const ref = db.collection(COLLECTION_WORDS).doc(item.chinese);

    batch.set(ref, item);
    batchSize++;
    count++;

    if (batchSize === BATCH_SIZE) {
      console.log(`Committing ${batchSize} words`);
      await batch.commit();

      console.log(`Uploaded ${count} words`);

      // 🔥 Prevent burst overload
      await sleep(DELAY_MS);

      batch = db.batch();
      batchSize = 0;
    }
  }

  // Final batch
  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`✅ Upload complete: ${count} words`);
}

// Load JSON
function loadJSON(path) {
  const raw = fs.readFileSync(path);
  return JSON.parse(raw);
}

// Remove undefined values (Firestore requirement)
function clean(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms = COMMIT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Commit timeout')), ms)
    )
  ]);
}

async function safeCommit(batch, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await withTimeout(batch.commit());
    } catch (e) {
      console.log(`⚠️ Retry ${i + 1}: ${e.message}`);
      await sleep(500 * (i + 1));
    }
  }
  throw new Error('❌ Commit failed after retries');
}

// Run
// uploadWords().catch(err => {
//   console.error('❌ Upload failed:', err);
// });


/**
 * Runs phrase script.
 */
function runScript() {
  const usage = 'Expected a collection name [user | category | word | image | phrase {start}]';
  if (process.argv.length < 3) {
    console.error(usage);
    process.exit(1);
  }

  const name = process.argv[2];
  switch (name) {
    case 'user':
      uploadUsers().catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'category':
      uploadCategories().catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'word':
      uploadWords().catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'image':
      uploadImages().catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'phrase':
      if (process.argv.length < 4) {
        console.error(usage);
        process.exit(1);
      }
      const start = process.argv[3];
      uploadPhrases(start).catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    default:
      console.error(usage);
  }
}

runScript()
