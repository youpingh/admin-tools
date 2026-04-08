/**
 * This script generates an image for each character in the words collection.
 * It uses the word.prompt as the character specific prompt and a list of generic 
 * prompts to call Gemini image generation API to generate images.
 */
const { GoogleGenAI } = require("@google/genai"); // New SDK
const { OpenAI } = require("openai");

const fs = require("fs");
const path = require('path');
const dotenv = require('dotenv');

/**
 *  CONFIGURATION
 */
dotenv.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_MODEL = "imagen-4.0-generate-001";
const OPENAI_MODEL = "gpt-image-1";
const IMAGE_FOLDER = "./test-images";
const PROMPT_FOLDER = "./prompts";

/**
 *  Initialize the new client, read the word collection into a JSON object
 **/
const geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 *  Builds a prompt use the character specific prompt and a list of generic prompts.
 */
function buildPrompt(word) {
  // console.log('building prompt:', word, word.image.prompt);
  return word.image.prompt;
}

// ---------- IMAGE GENERATION with OpenAI ----------
async function generateImageOpenAI(word) {
  const prompt = buildPrompt(word);

  console.log("-----");
  console.log(`Generating image for: ${word.chinese}`);
  console.log(prompt);

  const result = await openaiClient.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    size: "1024x1024"
  });


  for (const generatedImage of response.generatedImages) {
    const imgBytes = generatedImage.image.imageBytes;
    createImageFile(word, imgBytes);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  const imgBytes = result.data[0].b64_json;
  createImageFile(word, imgBytes);

  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 1000));
}

// ---------- IMAGE GENERATION with Gemini ----------
/**
 * Calls Gemini image generater to generate an image for the word.
 */
async function generateImageGemini(filename) {

  console.log('Processing ', `${PROMPT_FOLDER}/${filename}`);
  const json = fs.readFileSync(`${PROMPT_FOLDER}/${filename}`, 'utf8');
  const words = JSON.parse(json);

  let count = 0;
  for (const word of words) {
    if (!word.image.hasImage) {
      const prompt = buildPrompt(word);
      console.log(`Generating image for: ${word.chinese}, ${prompt}, hasImage ${word.image.hasImage}`);
      const response = await geminiClient.models.generateImages({
        model: GEMINI_MODEL,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: 'allow_all'
        },
      });

      for (const generatedImage of response.generatedImages) {
        const imgBytes = generatedImage.image.imageBytes;
        createImageFile(word, imgBytes);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }
      count++;
    }
  }
  console.log(`Generated ${count} images.`);
}

/**
 * Creates an image file.
 * @param {*} word 
 * @param {*} imgBytes 
 */
function createImageFile(word, imgBytes) {
  const buffer = Buffer.from(imgBytes, "base64");
  const outputDir = `${IMAGE_FOLDER}/${word.category}`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filename = `${word.chinese}.png`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, buffer);
  console.log(`Saved: ${filepath}`);
}

function runScript() {
  if (process.argv.length === 2) {
    console.error('Expected a JSON file name (e.g. food.json)');
    process.exit(1);
  }

  const filename = process.argv[2];
  generateImageGemini(filename);
}

runScript()
