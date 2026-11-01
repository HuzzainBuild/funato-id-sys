import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

function configureCloudinary() {
  cloudinary.config({
    cloud_name: "ddw2jxo6o",
    api_key: "114824879946414",
    api_secret: "Mm93TysD4BZJMuR01SclmI7Nl5Q",
  });
}

async function removeDuplicates() {
  try {
    configureCloudinary();

    let resources: any[] = [];
    let nextCursor: string | undefined = undefined;

    console.log(
      "Fetching assets from Cloudinary folder: funato/passports...",
    );

    // Fetch all images specifically from your target folder using expression or prefix
    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        resource_type: "image",
        prefix: "funato/passports", // Targets your specific folder path safely
        max_results: 500,
        next_cursor: nextCursor,
      });
      resources = resources.concat(result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log(
      `Fetched ${resources.length} total images from folder. Analyzing for duplicates...`,
    );

    const signatureMap = new Map<string, string[]>();

    // Group assets by signature
    resources.forEach((resource) => {
      const signature = resource.signature;
      if (!signatureMap.has(signature)) {
        signatureMap.set(signature, []);
      }
      signatureMap.get(signature)!.push(resource.public_id);
    });

    const duplicates: string[] = [];

    // For every signature group, keep the first one and mark the rest as duplicates
    signatureMap.forEach((publicIds) => {
      if (publicIds.length > 1) {
        // Skip the first item (the original), push the rest to duplicates
        for (let i = 1; i < publicIds.length; i++) {
          duplicates.push(publicIds[i]);
        }
      }
    });

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length}`);

      // Batch delete in chunks of 100 (Cloudinary API limit)
      const chunkSize = 100;
      for (let i = 0; i < duplicates.length; i += chunkSize) {
        const chunk = duplicates.slice(i, i + chunkSize);
        console.log(
          `Deleting batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} items)...`,
        );

        const deleteResult =
          await cloudinary.api.delete_resources(chunk);
        console.log("Batch delete result:", deleteResult);
      }

      console.log("All duplicate cleanups completed successfully!");
    } else {
      console.log("No duplicate images found in this folder.");
    }
  } catch (error) {
    console.error("Error removing duplicates:", error);
  }
}

removeDuplicates();
