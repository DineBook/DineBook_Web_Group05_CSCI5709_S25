import mongoose from "mongoose";
import { Restaurant } from "../models/restaurant";
import dotenv from "dotenv";

dotenv.config();

async function createGeospatialIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Get current indexes
    const indexes = await Restaurant.collection.indexes();
    console.log("Current indexes:", indexes.map((idx) => ({ name: idx.name, key: idx.key })));

    // Drop all existing geospatial indexes to clean up conflicts
    try {
      // Try to drop specific indexes that might be causing conflicts
      const geospatialIndexes = indexes.filter(idx =>
        JSON.stringify(idx.key).includes('2dsphere')
      );

      console.log(`Found ${geospatialIndexes.length} geospatial indexes to clean up`);

      for (const index of geospatialIndexes) {
        if (index.name && index.name !== '_id_') { // Don't drop the _id index
          try {
            await Restaurant.collection.dropIndex(index.name);
            console.log(`✓ Dropped index: ${index.name}`);
          } catch (error) {
            console.log(`✗ Could not drop index ${index.name}:`, (error as Error).message);
          }
        }
      }
    } catch (error) {
      console.log("Error dropping indexes:", (error as Error).message);
    }

    // Wait a moment for changes to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create new 2dsphere index on geometry field only if it doesn't exist
    try {
      // Check current indexes to see if geometry index exists
      const currentIndexes = await Restaurant.collection.indexes();
      const existingGeometryIndex = currentIndexes.find(idx =>
        idx.key && idx.key.geometry === '2dsphere'
      );

      if (!existingGeometryIndex) {
        await Restaurant.collection.createIndex(
          { geometry: "2dsphere" },
          {
            name: "geometry_2dsphere",
            sparse: true, // Only index documents that have the geometry field
            background: true // Build index in background
          }
        );
        console.log("✓ Created geometry_2dsphere index successfully");
      } else {
        console.log("✓ geometry_2dsphere index already exists");
      }
    } catch (error) {
      console.log("✗ Error creating geometry index:", (error as Error).message);
    }

    // Verify the final indexes
    const finalIndexes = await Restaurant.collection.indexes();
    console.log("Final indexes:", finalIndexes.map((idx) => ({ name: idx.name, key: idx.key })));

    process.exit(0);
  } catch (error) {
    console.error("Error managing indexes:", error);
    process.exit(1);
  }
}

createGeospatialIndex();
