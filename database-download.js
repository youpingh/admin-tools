/**
 * This Node script downloads one or all data collections (words, categories, phrases, greeting-images and users)
 * to 5 local JSON files as a backup.
 * The backup files can also be used to upload the collections to the database to refresh it.
 * The downloaded JSON file names are ../work/${collection}.json.
 * Run the script
 * $ node database-download.js [all | user | category | word | image | phrase]
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

// The collections are downloaded to here
const DATA_FOLDER = './work';

/**
 * Downloads the specified collection to a JSON file: DATA_FOLDER/collection.json
 */
async function downloadCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  const dataItems = [];

  snapshot.forEach((doc) => {
    const item = doc.data();
    // console.log(item);
    dataItems.push(item);
  });

  // sort by category if the collection item has the 'category' field
  let sortedData = dataItems;
  const firstItem = dataItems[0];
  if (Object.hasOwn(firstItem, 'category')) {
    sortedData = dataItems.sort((a, b) => {
      return a.category.localeCompare(b.category);
    });
  }

  const filePath = `${DATA_FOLDER}/${collectionName}.json`;
  const jsonOut = JSON.stringify(sortedData);
  const jsonString = jsonOut.replaceAll('},{', '},\n{');
  fs.writeFileSync(filePath, jsonString);

  console.log(`✅ Exported ${DATA_FOLDER}/${collectionName} (${sortedData.length} docs)`);
}

/**
 * Runs the script.
 */
async function runScript() {
  const usage = 'Expected a collection name [all | user | category | word | image | phrase]';
  if (process.argv.length < 3) {
    console.error(usage);
    process.exit(1);
  }

  const collections = ['users', 'categories', 'words', 'greeting-images', 'phrases'];
  const name = process.argv[2];
  switch (name) {
    case 'user':
      await downloadCollection(collections[0]);
      break;
    case 'category':
      await downloadCollection(collections[1]);
      break;
    case 'word':
      await downloadCollection(collections[2]);
      break;
    case 'image':
      await downloadCollection(collections[3]);
      break;
    case 'phrase':
      await downloadCollection(collections[4]);
      break;
    case 'all':
      for (const collection of collections) {
        await downloadCollection(collection);
      }
      break;
    default:
      console.error(usage);
  }
}

runScript()

