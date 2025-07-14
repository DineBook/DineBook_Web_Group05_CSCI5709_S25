import mongoose from "mongoose";
import { Restaurant } from "../models/restaurant";
import dotenv from "dotenv";

dotenv.config();

async function createGeospatialIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Drop existing index if it exists
    try {
      await Restaurant.collection.dropIndex("geometry_2dsphere");
      console.log("Dropped existing geospatial index");
    } catch (error) {
      console.log("No existing geospatial index found");
    }

    // Create new 2dsphere index
    await Restaurant.collection.createIndex({ geometry: "2dsphere" });
    console.log("Created 2dsphere index successfully");

    // Verify the index
    const indexes = await Restaurant.collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((idx) => idx.name)
    );

    process.exit(0);
  } catch (error) {
    console.error("Error creating index:", error);
    process.exit(1);
  }
}

createGeospatialIndex();
