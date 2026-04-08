//
// This script sets the listed emails as admin users
// Run the following commands once to install some packages
// npm init -y
// npm install firebase-admin

// Run the script with node
// node setCustomClaims.js
//

const admin = require("firebase-admin");

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

async function setAdmin(email) {
  try {
    // Find user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set custom claims
	if (user) {
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Set admin=true for ${email}`);
	} else {
		console.log(`No this user: ${email}`);
	}
  } catch (error) {
    console.error("❌ Error setting admin claim:", error);
  }
}

// 👉 Add your admin emails here
const admins = [
  "youping_hu@greatwallchineseacademy.org",
  "youpingh@gmail.com",
];

(async () => {
  for (const email of admins) {
    await setAdmin(email);
  }
  process.exit(0);
})();
