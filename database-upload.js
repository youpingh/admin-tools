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

// 🔥 Initialize
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
const BATCH_SIZE = 300;     // safer than 500
const DELAY_MS = 400;       // small delay between batches
const COMMIT_TIMEOUT = 20000;
const NUMBER_RETRIES = 5;

// Load data from this number, which is an index of the data array
let startFrom = 0;

// Uploads objects in batches
async function batchUpload(jsonFile, collection, idField) {
  console.log(`Start uploading ${collection} ...`);

  const items = loadJSON(jsonFile);
  console.log(`Loaded ${items.length} objects from ${jsonFile}`);

  let batch = db.batch();
  let batchSize = 0;
  let count = 0;

  for (let i = startFrom; i < items.length; i++) {
    const item = items[i];
    const idValue = getIdValue(item, idField);
    if (idValue && idValue.length > 0) {
      // console.log(`Uploading ${idValue}`);

      // create a doc with the specified id value as key
      const ref = db.collection(collection).doc(idValue);

      batch.set(ref, item);
      batchSize++;
      count++;

      if (batchSize === BATCH_SIZE) {
        // console.log(`Committing ${batchSize} items`);
        await batch.commit();
        console.log(`Uploaded ${count} items from ${startFrom}`);

        // 🔥 Prevent burst overload
        await sleep(DELAY_MS);

        // start a new batch
        batch = db.batch();
        batchSize = 0;
      }
    }
  }

  // Final batch
  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`✅ Upload complete: ${count} items from ${startFrom}`);
}

// Get the id value of the item
function getIdValue(item, idField) {
  return (Object.hasOwn(item, idField) ? item[idField] : null);
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

// Timeout
function withTimeout(promise, ms = COMMIT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Commit timeout')), ms)
    )
  ]);
}

// Commit with retries
async function safeCommit(batch) {
  for (let i = 0; i < NUMBER_RETRIES; i++) {
    try {
      return await withTimeout(batch.commit());
    } catch (e) {
      console.log(`⚠️ Retry ${i + 1}: ${e.message}`);
      await sleep(500 * (i + 1));
    }
  }
  throw new Error('❌ Commit failed after retries');
}

/**
 * Runs the script.
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
      batchUpload(JSON_USERS, COLLECTION_USERS, 'email').catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'category':
      batchUpload(JSON_CATEGORIES, COLLECTION_CATEGORIES, 'category').catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'word':
      batchUpload(JSON_WORDS, COLLECTION_WORDS, 'chinese').catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'image':
      batchUpload(JSON_IMAGES, COLLECTION_IMAGES, 'category').catch(err => {
        console.error('❌ Upload failed:', err);
      });
      break;
    case 'phrase':
      if (process.argv.length < 4) {
        console.error(usage);
      } else {
        startFrom = process.argv[3];
        batchUpload(JSON_PHRASES, COLLECTION_PHRASES, 'phrase').catch(err => {
          console.error('❌ Upload failed:', err);
        });
      }
      break;
    default:
      console.error(usage);
  }
}

runScript()
