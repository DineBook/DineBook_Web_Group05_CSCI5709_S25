import mongoose from "mongoose";
import { User } from "../models/user";
import { Restaurant } from "../models/restaurant";
import { Review } from "../models/review";
import dotenv from "dotenv";

dotenv.config();

// Configuration flags
const CLEAR_EXISTING_DATA = process.env.CLEAR_DB === 'true' || process.argv.includes('--clear');

// Seed data arrays
const users = [
    // Restaurant Owners
    {
        name: "Sarah Mitchell",
        email: "sarah.mitchell@gmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    {
        name: "Marcus Chen",
        email: "marcus.chen@outlook.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    {
        name: "Isabella Rodriguez",
        email: "isabella.rodriguez@yahoo.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    {
        name: "James Thompson",
        email: "james.thompson@gmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    {
        name: "Priya Patel",
        email: "priya.patel@hotmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    {
        name: "David Wilson",
        email: "david.wilson@gmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "owner",
        isVerified: true
    },
    // Customers for reviews
    {
        name: "Emily Johnson",
        email: "emily.johnson@gmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "customer",
        isVerified: true
    },
    {
        name: "Alex Kim",
        email: "alex.kim@outlook.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "customer",
        isVerified: true
    },
    {
        name: "Rachel Brown",
        email: "rachel.brown@yahoo.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "customer",
        isVerified: true
    },
    {
        name: "Michael Davis",
        email: "michael.davis@gmail.com",
        password: "$2y$10$JLS5EH9QL/oUzBPYuiu78.oQxL6TfhrfYM.zSMR5ykSyICtPvKOeS",
        role: "customer",
        isVerified: true
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("✓ Connected to MongoDB");

        // Clear existing data only if flag is set
        if (CLEAR_EXISTING_DATA) {
            console.log("🧹 Clearing existing data...");
            await Review.deleteMany({});
            await Restaurant.deleteMany({});
            await User.deleteMany({});
            console.log("✓ Existing data cleared");
        } else {
            console.log("ℹ️  Preserving existing data (use --clear flag or CLEAR_DB=true to clear)");
        }

        // Create users
        console.log("👥 Creating users...");
        let createdUsers: any[] = [];
        try {
            createdUsers = await User.insertMany(users);
            console.log(`✓ Created ${createdUsers.length} users`);
        } catch (error) {
            console.warn(`⚠️  Failed to create some/all users:`, (error as Error).message);
            // Try to get existing users if any were created before the error
            try {
                createdUsers = await User.find({ email: { $in: users.map(u => u.email) } });
                console.log(`ℹ️  Found ${createdUsers.length} existing users to use`);
            } catch (findError) {
                console.warn(`⚠️  Could not find existing users, continuing without user data`);
            }
        }

        // Get owner IDs for restaurants
        const owners = createdUsers.filter(user => user.role === 'owner');
        const customers = createdUsers.filter(user => user.role === 'customer');

        if (owners.length === 0) {
            console.warn(`⚠️  No owner users available, skipping restaurant creation`);
        }

        // Restaurants data - 2 within 5km, 4 outside 5km of Halifax coordinates (44.6404358255649, -63.57834599334971)
        const restaurants = [
            // WITHIN 5KM RADIUS
            {
                name: "The Coastal Table",
                cuisine: "Mediterranean",
                location: "1234 Spring Garden Road, Halifax, NS",
                coordinates: {
                    latitude: 44.6459, // ~0.6km from center
                    longitude: -63.5792
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.5792, 44.6459] // [lng, lat]
                },
                address: {
                    street: "1234 Spring Garden Road",
                    city: "Halifax",
                    province: "Nova Scotia",
                    postalCode: "B3J 3K9"
                },
                priceRange: 3,
                ownerId: owners[0]._id,
                description: "Fresh Mediterranean cuisine with locally sourced ingredients and ocean views. Our menu features authentic dishes from Greece, Italy, and the broader Mediterranean region.",
                phoneNumber: "+1 (902) 555-0123",
                email: "info@coastaltable.ca",
                capacity: 80,
                openingHours: {
                    monday: { open: "11:00", close: "22:00" },
                    tuesday: { open: "11:00", close: "22:00" },
                    wednesday: { open: "11:00", close: "22:00" },
                    thursday: { open: "11:00", close: "23:00" },
                    friday: { open: "11:00", close: "23:00" },
                    saturday: { open: "10:00", close: "23:00" },
                    sunday: { open: "10:00", close: "21:00" }
                },
                isActive: true
            },
            {
                name: "Maple & Sage Bistro",
                cuisine: "Italian",
                location: "567 Barrington Street, Halifax, NS",
                coordinates: {
                    latitude: 44.6485, // ~1.2km from center
                    longitude: -63.5735
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.5735, 44.6485]
                },
                address: {
                    street: "567 Barrington Street",
                    city: "Halifax",
                    province: "Nova Scotia",
                    postalCode: "B3J 1Z7"
                },
                priceRange: 2,
                ownerId: owners[1]._id,
                description: "Contemporary Canadian cuisine celebrating Maritime flavors and local producers. From seafood to farm-fresh ingredients, we showcase the best of Nova Scotia.",
                phoneNumber: "+1 (902) 555-0234",
                email: "hello@maplesagebistro.ca",
                capacity: 65,
                openingHours: {
                    monday: { open: "17:00", close: "22:00" },
                    tuesday: { open: "17:00", close: "22:00" },
                    wednesday: { open: "17:00", close: "22:00" },
                    thursday: { open: "17:00", close: "23:00" },
                    friday: { open: "17:00", close: "23:00" },
                    saturday: { open: "16:00", close: "23:00" },
                    sunday: { open: "16:00", close: "21:00" }
                },
                isActive: true
            },

            // OUTSIDE 5KM RADIUS
            {
                name: "Sakura Sushi House",
                cuisine: "Japanese",
                location: "890 Bedford Highway, Bedford, NS",
                coordinates: {
                    latitude: 44.7123, // ~8km north
                    longitude: -63.6456
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.6456, 44.7123]
                },
                address: {
                    street: "890 Bedford Highway",
                    city: "Bedford",
                    province: "Nova Scotia",
                    postalCode: "B4A 2X3"
                },
                priceRange: 3,
                ownerId: owners[2]._id,
                description: "Authentic Japanese cuisine featuring fresh sushi, sashimi, and traditional dishes. Our chefs bring years of experience from Tokyo to Halifax.",
                phoneNumber: "+1 (902) 555-0345",
                email: "orders@sakurasushi.ca",
                capacity: 55,
                openingHours: {
                    monday: { open: "17:00", close: "22:00" },
                    tuesday: { open: "17:00", close: "22:00" },
                    wednesday: { open: "17:00", close: "22:00" },
                    thursday: { open: "17:00", close: "22:00" },
                    friday: { open: "17:00", close: "23:00" },
                    saturday: { open: "16:30", close: "23:00" },
                    sunday: { open: "16:30", close: "21:30" }
                },
                isActive: true
            },
            {
                name: "Tandoor Palace",
                cuisine: "Indian",
                location: "234 Portland Street, Dartmouth, NS",
                coordinates: {
                    latitude: 44.6712, // ~6km southeast
                    longitude: -63.5234
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.5234, 44.6712]
                },
                address: {
                    street: "234 Portland Street",
                    city: "Dartmouth",
                    province: "Nova Scotia",
                    postalCode: "B2Y 1J8"
                },
                priceRange: 2,
                ownerId: owners[3]._id,
                description: "Traditional Indian cuisine with aromatic spices and authentic flavors. Our tandoor oven creates the perfect naan and succulent meat dishes.",
                phoneNumber: "+1 (902) 555-0456",
                email: "info@tandoorpalace.ca",
                capacity: 70,
                openingHours: {
                    monday: { open: "16:00", close: "22:00" },
                    tuesday: { open: "16:00", close: "22:00" },
                    wednesday: { open: "16:00", close: "22:00" },
                    thursday: { open: "16:00", close: "22:00" },
                    friday: { open: "16:00", close: "23:00" },
                    saturday: { open: "15:00", close: "23:00" },
                    sunday: { open: "15:00", close: "22:00" }
                },
                isActive: true
            },
            {
                name: "Ristorante Bella Vista",
                cuisine: "Italian",
                location: "456 Hammonds Plains Road, Hammonds Plains, NS",
                coordinates: {
                    latitude: 44.7834, // ~16km northwest
                    longitude: -63.7245
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.7245, 44.7834]
                },
                address: {
                    street: "456 Hammonds Plains Road",
                    city: "Hammonds Plains",
                    province: "Nova Scotia",
                    postalCode: "B4B 1P6"
                },
                priceRange: 4,
                ownerId: owners[4]._id,
                description: "Elegant Italian dining featuring homemade pasta, wood-fired pizzas, and an extensive wine selection. A romantic setting perfect for special occasions.",
                phoneNumber: "+1 (902) 555-0567",
                email: "reservations@bellavista.ca",
                capacity: 90,
                openingHours: {
                    monday: { open: "17:30", close: "22:00" },
                    tuesday: { open: "17:30", close: "22:00" },
                    wednesday: { open: "17:30", close: "22:00" },
                    thursday: { open: "17:30", close: "22:30" },
                    friday: { open: "17:30", close: "23:00" },
                    saturday: { open: "17:00", close: "23:00" },
                    sunday: { open: "17:00", close: "21:30" }
                },
                isActive: true
            },
            {
                name: "Coastal Fish & Chips",
                cuisine: "American",
                location: "789 Herring Cove Road, Halifax, NS",
                coordinates: {
                    latitude: 44.5812, // ~7km southwest
                    longitude: -63.6234
                },
                geometry: {
                    type: "Point",
                    coordinates: [-63.6234, 44.5812]
                },
                address: {
                    street: "789 Herring Cove Road",
                    city: "Halifax",
                    province: "Nova Scotia",
                    postalCode: "B3R 1Z3"
                },
                priceRange: 1,
                ownerId: owners[5]._id,
                description: "Classic fish and chips using fresh Atlantic cod and hand-cut fries. A casual, family-friendly spot with generous portions and maritime hospitality.",
                phoneNumber: "+1 (902) 555-0678",
                email: "orders@coastalfish.ca",
                capacity: 45,
                openingHours: {
                    monday: { open: "11:00", close: "21:00" },
                    tuesday: { open: "11:00", close: "21:00" },
                    wednesday: { open: "11:00", close: "21:00" },
                    thursday: { open: "11:00", close: "21:00" },
                    friday: { open: "11:00", close: "22:00" },
                    saturday: { open: "11:00", close: "22:00" },
                    sunday: { open: "12:00", close: "20:00" }
                },
                isActive: true
            }
        ];

        // Create restaurants
        console.log("🍽️  Creating restaurants...");
        let createdRestaurants: any[] = [];
        if (owners.length > 0) {
            try {
                createdRestaurants = await Restaurant.insertMany(restaurants);
                console.log(`✓ Created ${createdRestaurants.length} restaurants`);
            } catch (error) {
                console.warn(`⚠️  Failed to create some/all restaurants:`, (error as Error).message);
                // Try to get existing restaurants if any were created before the error
                try {
                    createdRestaurants = await Restaurant.find({
                        name: { $in: restaurants.map(r => r.name) }
                    });
                    console.log(`ℹ️  Found ${createdRestaurants.length} existing restaurants to use`);
                } catch (findError) {
                    console.warn(`⚠️  Could not find existing restaurants, continuing without restaurant data`);
                }
            }
        } else {
            console.log(`⏭️  Skipping restaurant creation (no owners available)`);
        }

        // Create reviews
        console.log("⭐ Creating reviews...");
        let createdReviews: any[] = [];
        if (customers.length > 0 && createdRestaurants.length > 0) {
            // Define reviews array
            const reviews = [
                // Reviews for The Coastal Table
                {
                    customerId: customers[0]._id,
                    restaurantId: createdRestaurants[0]._id,
                    rating: 5,
                    comment: "Absolutely fantastic Mediterranean food! The grilled halibut was perfectly cooked and the atmosphere is wonderful. Definitely coming back!"
                },
                {
                    customerId: customers[1]._id,
                    restaurantId: createdRestaurants[0]._id,
                    rating: 4,
                    comment: "Great food and service. The quinoa bowl was delicious and very filling. Only complaint is that it can get quite busy on weekends."
                },
                // Reviews for Maple & Sage Bistro
                {
                    customerId: customers[2]._id,
                    restaurantId: createdRestaurants[1]._id,
                    rating: 5,
                    comment: "The lobster roll here is the best in Halifax! Fresh, generous portion, and the wild blueberry cheesecake was divine. Highly recommend!"
                },
                {
                    customerId: customers[3]._id,
                    restaurantId: createdRestaurants[1]._id,
                    rating: 4,
                    comment: "Lovely Canadian cuisine with a modern twist. The staff was knowledgeable about local ingredients. Will definitely return."
                },
                // Reviews for Sakura Sushi House
                {
                    customerId: customers[0]._id,
                    restaurantId: createdRestaurants[2]._id,
                    rating: 5,
                    comment: "Authentic Japanese cuisine! The omakase was exceptional - every piece of sushi was perfect. Worth the drive to Bedford."
                },
                // Reviews for Tandoor Palace
                {
                    customerId: customers[1]._id,
                    restaurantId: createdRestaurants[3]._id,
                    rating: 4,
                    comment: "Excellent Indian food with authentic flavors. The butter chicken was creamy and perfectly spiced. Great value for money."
                },
                // Reviews for Ristorante Bella Vista
                {
                    customerId: customers[2]._id,
                    restaurantId: createdRestaurants[4]._id,
                    rating: 5,
                    comment: "Exceptional Italian dining experience! The osso buco was melt-in-your-mouth tender and the service was impeccable. Perfect for a special occasion."
                },
                // Reviews for Coastal Fish & Chips
                {
                    customerId: customers[3]._id,
                    restaurantId: createdRestaurants[5]._id,
                    rating: 4,
                    comment: "Best fish and chips in the area! Fresh cod, crispy batter, and generous portions. A true Maritime experience."
                }
            ];

            // Only create reviews for restaurants that were successfully created
            const validReviews = reviews.filter(review => {
                const restaurantExists = createdRestaurants.some(r =>
                    r._id.toString() === review.restaurantId.toString()
                );
                const customerExists = customers.some(c =>
                    c._id.toString() === review.customerId.toString()
                );
                return restaurantExists && customerExists;
            });

            if (validReviews.length > 0) {
                try {
                    createdReviews = await Review.insertMany(validReviews);
                    console.log(`✓ Created ${createdReviews.length} reviews`);
                } catch (error) {
                    console.warn(`⚠️  Failed to create some/all reviews:`, (error as Error).message);
                    // Try to get existing reviews if any were created before the error
                    try {
                        createdReviews = await Review.find({
                            restaurantId: { $in: createdRestaurants.map(r => r._id) }
                        });
                        console.log(`ℹ️  Found ${createdReviews.length} existing reviews`);
                    } catch (findError) {
                        console.warn(`⚠️  Could not find existing reviews`);
                    }
                }
            } else {
                console.log(`⏭️  No valid reviews to create (missing restaurants or customers)`);
            }
        } else {
            console.log(`⏭️  Skipping review creation (no customers or restaurants available)`);
        }

        // Update restaurant average ratings
        console.log("📊 Updating restaurant average ratings...");
        if (createdRestaurants.length > 0) {
            try {
                for (const restaurant of createdRestaurants) {
                    try {
                        const restaurantReviews = await Review.find({ restaurantId: restaurant._id });
                        if (restaurantReviews.length > 0) {
                            const avgRating = restaurantReviews.reduce((sum, review) => sum + review.rating, 0) / restaurantReviews.length;
                            await Restaurant.findByIdAndUpdate(restaurant._id, { _averageRating: avgRating });
                        }
                    } catch (error) {
                        console.warn(`⚠️  Failed to update rating for restaurant ${restaurant.name}:`, (error as Error).message);
                    }
                }
                console.log("✓ Updated restaurant average ratings");
            } catch (error) {
                console.warn(`⚠️  Failed to update restaurant ratings:`, (error as Error).message);
            }
        } else {
            console.log(`⏭️  Skipping rating updates (no restaurants available)`);
        }

        // Summary
        console.log("\n🎉 Seed data process completed!");
        console.log("=====================================");
        if (CLEAR_EXISTING_DATA) {
            console.log("🧹 Database was cleared before seeding");
        } else {
            console.log("📝 Data was added to existing database");
        }
        console.log(`👥 Users: ${createdUsers.length} total`);
        console.log(`   - Owners: ${owners.length}`);
        console.log(`   - Customers: ${customers.length}`);
        console.log(`🍽️  Restaurants: ${createdRestaurants.length} total`);
        if (createdRestaurants.length > 0) {
            console.log(`   - Within 5km of Halifax center: 2 expected`);
            console.log(`   - Outside 5km radius: 4 expected`);
        }
        console.log(`⭐ Reviews: ${createdReviews.length} total`);
        console.log("\n📍 Test coordinates: 44.6404358255649, -63.57834599334971");
        console.log("🔍 Expected restaurants within 5km: The Coastal Table, Maple & Sage Bistro");
        console.log("\n💡 Usage:");
        console.log("   npm run seed           - Add data to existing database");
        console.log("   npm run seed --clear   - Clear database before seeding");
        console.log("   CLEAR_DB=true npm run seed - Clear database before seeding");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();
