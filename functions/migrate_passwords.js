const admin = require("firebase-admin");
const argon2 = require("argon2");

process.env.GOOGLE_CLOUD_PROJECT = "hosainan-school";
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: "hosainan-school" });
const db = admin.firestore();

const shaMap = {
  "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92": "123456",
  "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5": "12345",
  "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4": "1234",
  "15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225": "123456789",
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918": "admin",
  "91b4d142823f7d2474c4ad9eb9e7e42df3e92c0f4c0cf06c4c9b5ac2e6c4f81a": "000000",
  "bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a": "111111"
};

async function migrate() {
  const snap = await db.collection("users").get();
  console.log("Total users:", snap.size);
  let updated = 0, skipped = 0, unknown = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const hash = data.passHash || "";
    if (/^[a-f0-9]{64}$/.test(hash)) {
      const password = shaMap[hash];
      if (password) {
        const newHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 32768, timeCost: 3, parallelism: 1 });
        await doc.ref.update({ passHash: newHash });
        console.log("Updated:", data.userId, "password:", password);
        updated++;
      } else {
        console.log("Unknown SHA256:", data.userId, hash.substring(0,16) + "...");
        unknown++;
      }
    } else {
      skipped++;
    }
  }
  console.log("Done — Updated:", updated, "| Skipped:", skipped, "| Unknown:", unknown);
  process.exit(0);
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
