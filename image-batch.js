import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import readline from 'readline';

// configuration
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const JSONL_DIRECTORY = "./prompts";
const OUTPUT_DIRECTORY = "./klc-images";
const WORK_DIRECTORY = "./work";
const WAIT_TIME = 10 * 60 * 1000; // the time interval for polling the batch job status

// 1. Initialize the new Client
// This client handles both files and models in one place
const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Uploads a JSONL file to the Gemini Image AI server and starts batch job.
 * @param {*} category - the prompts file for the batch job
 */
async function runBatchJob(category) {
    const jsonlFile = `${JSONL_DIRECTORY}/${category}.jsonl`;
    const jobName = `KLC-IMAGES-${category}`;
    if (!fs.existsSync(jsonlFile)) {
        console.error(`${jsonlFile} doesn't exist.`);
        return;
    }
    console.log(`Creating batch job for ${category}, jsonl file ${jsonlFile}, job name ${jobName}`);

    try {
        // 2. Upload the JSONL file using the unified client
        const uploadResponse = await client.files.upload({
            file: jsonlFile,
            config: {
                displayName: jobName,
                mimeType: "application/jsonl"
            }
        });

        console.log(`File uploaded: ${uploadResponse.name}`);

        // 3. Create the batch job
        const batchJob = await client.batches.create({
            model: GEMINI_MODEL,
            src: uploadResponse.name
        });

        console.log(`✅ Batch Job Created!`);
        console.log(`Batch Job ID: ${batchJob.name}`);
        console.log(`Current State: ${batchJob.state}`);

        // 4. Wait a few minutes and then start checking the status of the batch job
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
        pollAndDownload(batchJob.name, category)
    } catch (error) {
        console.error("❌ Error starting batch:", error);
    }
}

/**
 * Polls the batch job state to check if the batch job is completed. Downloads the results, 
 * converts it to the png format and then saves it to an image file when the job is completed.
 */
async function pollAndDownload(batchJobId, category) {

    // make sure the output image folder exists
    if (!fs.existsSync(OUTPUT_DIRECTORY)) fs.mkdirSync(OUTPUT_DIRECTORY);

    console.log(`🔎 Monitoring Batch Job: ${batchJobId}`);
    let completed = false;
    while (!completed) {
        const now = `[${new Date().toLocaleTimeString()}] `;
        try {
            const job = await client.batches.get({ name: batchJobId });
            const state = job.state;

            // console.log(`[${new Date().toLocaleTimeString()}] Current State: ${state}`);
            switch (state) {
                case "JOB_STATE_SUCCEEDED":
                    console.log(`✅ ${now} Job completed! Downloading results ...`);
                    await downloadAndExtract(job, category);
                    completed = true;
                    break;
                case "JOB_STATE_QUEUED":
                case "JOB_STATE_PENDING":
                case "JOB_STATE_RUNNING":
                    // Wait for a few minutes before checking it again to avoid rate limits
                    console.log(`✨ ${now} Job is running with state: ${state}`)
                    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
                    break;
                case "JOB_STATE_FAILED":
                case "JOB_STATE_CANCELLING":
                case "JOB_STATE_CANCELLED":
                case "JOB_STATE_EXPIRED":
                default:
                    console.log(`❌ ${now} Job ended with state: ${state}`)
                    completed = true;
                    break;
            }
        } catch (error) {
            console.error(`⚠️ ${now} Error polling status:, ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, WAIT_TIME)); // Retry on network error
        }
    }
}

/**
 * Downloads the result and converts them to png format to save.
 * @param {*} job 
 * @param {*} category 
 * @returns 
 */
async function downloadAndExtract(job, category) {
    const outputFile = job.dest?.fileName;
    if (!outputFile) {
        console.error("❌ No results in the batch job.");
        return;
    }

    console.log(`📥 Downloading results...`);
    const resultfile = `${WORK_DIRECTORY}/${category}-result.jsonl`
    const logfile = `${WORK_DIRECTORY}/${category}-log.txt`
    await client.files.download({ file: outputFile, downloadPath: resultfile });

    // Create a read stream and a readline interface
    const fileStream = fs.createReadStream(resultfile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let failCount = 0;
    let successCount = 0;
    let errorMessages = [];

    console.log("Processing results line by line...");

    for await (const line of rl) {
        if (!line.trim()) continue;

        try {
            const entry = JSON.parse(line);
            const customId = entry.custom_id || "unknown_unknown";
            const response = entry.response;

            // Check for Image Data (Success)
            const imagePart = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart) {
                const buffer = Buffer.from(imagePart.inlineData.data, "base64");
                createImageFile(customId, buffer);
                successCount++;
                if (successCount % 10 === 0) console.log(`Processed ${successCount} images...`);
            } else {
                failCount++;
                const reason = response?.candidates?.[0]?.finishReason || "UNKNOWN_ERROR";
                const feedback = response?.promptFeedback?.blockReason || "";
                let errorDetail = `ID: ${customId} | Reason: ${reason}`;
                if (feedback) errorDetail += ` | Feedback: ${feedback}`;
                errorMessages.push(errorDetail);
                console.log(`⚠️ Blocked: ${customId} (${reason})`);
            }
        } catch (parseError) {
            console.error(`❌ Error parsing line: ${parseError.message}`);
        }
    }

    if (errorMessages.length > 0) {
        fs.writeFileSync(logfile, errorMessages.join('\n'));
        console.log(`\n📄 Error log created: ${logfile}`);
    }

    console.log(`\n✅ Done! Generated: ${successCount} | Failed: ${failCount}`);
}

/**
 * Creates an image file in the specified folder (customId = 'folder-imageName').
 * The image file is named as OUTPUT_DIRECTORY/folder/imageName.png.
 * @param {*} customId folder-imageName
 * @param {*} base64data image data in png format
 */
function createImageFile(customId, base64data) {
    const names = customId.split('-');
    const folder = OUTPUT_DIRECTORY + '/' + names[0];
    const filename = names[1] + '.png';
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
    }
    fs.writeFileSync(path.join(folder, filename), base64data);
}

/**
 * Runs create, download or cancel accordingly.
 */
function runScript() {
    if (process.argv.length != 4) {
        console.error('Expected a command and a parameter: [create | download | cancel] [jsonl | batchId]');
        process.exit(1);
    }

    const command = process.argv[2]; // [create | download | cancel]
    const argv3 = process.argv[3]; // [jsonl | batchId]
    if (command == 'create') {
        runBatchJob(argv3)
    } else if (command === 'download') {
        pollAndDownload(argv3);
    } else if (command == 'cancel') {
        cancelBatchJob(argv3)
    } else {
        console.error('Expected a command and a parameter: [create | download | cancel] [jsonl | batchId]');
        process.exit(1);
    }
}

runScript()
