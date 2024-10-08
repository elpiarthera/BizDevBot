const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require("./firebase-key.json")),
  databaseURL: "https://arthera-biz-dev-bot.firebaseio.com",
});

/**
 * Exports all collections from Firestore, including nested collections.
 * @return {Promise<void>}
 */
async function exportCollections() {
  const db = admin.firestore();
  const categoriesRef = db.collection("categories");
  const categoriesSnapshot = await categoriesRef.get();

  const categoriesData = [];

  for (const categoryDoc of categoriesSnapshot.docs) {
    const categoryData = {
      id: categoryDoc.id,
      ...categoryDoc.data(),
      functions: [], // Initialize an array for functions
    };

    // Get the nested functions collection
    const functionsRef = categoryDoc.ref.collection("functions");
    const functionsSnapshot = await functionsRef.get();

    functionsSnapshot.forEach((funcDoc) => {
      categoryData.functions.push({
        id: funcDoc.id,
        ...funcDoc.data(),
      });
    });

    categoriesData.push(categoryData);
  }

  // Save to JSON file
  fs.writeFileSync("./categories.json", JSON.stringify(categoriesData, null, 2));
  console.log("Exported categories with functions");
}

// Run the export function
exportCollections().catch(console.error);
