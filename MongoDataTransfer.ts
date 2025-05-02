
import mongoose from 'mongoose';

// Use environment variables for database URIs with fallbacks
const SOURCE_DB_URI = 'mongodb+srv://xxxx@yyyyyy.mongodb.net/?retryWrites=true&w=majority&appName=oldCluster';
const TARGET_DB_URI = 'mongodb+srv://xxxxx@yyyyy.mongodb.net/?retryWrites=true&w=majority&appName=NewCluster';

if (!SOURCE_DB_URI || !TARGET_DB_URI) {
	console.error('Please ensure DATABASE_URL and AUTOMATION_DATABASE_URL are set in your environment files');
	process.exit(1);
}

async function copyCollections(sourceMongo: mongoose.Mongoose, targetMongo: mongoose.Mongoose) {
	console.log(`Copying collections...`);

	try {
		// Access the database directly from the connection
		const sourceDb = sourceMongo.connection.db;
		const targetDb = targetMongo.connection.db;

		if (!sourceDb || !targetDb) {
			throw new Error('Database connections not properly established');
		}

		// Get all collections from source database
		const collections = await sourceDb.listCollections().toArray();
		console.log(`Found ${collections.length} collections to copy`);

		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name;
			console.log(`Processing collection: ${collectionName}`);

			try {
				// Get source collection data
				const sourceCollection = sourceDb.collection(collectionName);
				const sourceData = await sourceCollection.find({}).toArray();

				if (sourceData.length === 0) {
					console.log(`No data found in ${collectionName}, skipping`);
					continue;
				}

				console.log(`Found ${sourceData.length} documents in ${collectionName}`);

				// Check if collection exists in target database, create if not
				let targetCollection;
				try {
					targetCollection = targetDb.collection(collectionName);
				} catch (e) {
					await targetDb.createCollection(collectionName);
					targetCollection = targetDb.collection(collectionName);
				}

				// Clear target collection
				await targetCollection.deleteMany({});
				console.log(`Cleared existing data in target collection: ${collectionName}`);

				// Insert data in batches
				const batchSize = 100;
				let insertedCount = 0;

				for (let i = 0; i < sourceData.length; i += batchSize) {
					const batch = sourceData.slice(i, i + batchSize);
					const docsToInsert = batch.map(doc => {
						// Keep original _id
						return doc;
					});

					try {
						const result = await targetCollection.insertMany(docsToInsert, { ordered: false });
						insertedCount += result.insertedCount;
						console.log(`Inserted batch ${i / batchSize + 1} for ${collectionName}`);
					} catch (batchError) {
						console.error(`Error inserting batch for ${collectionName}:`, batchError);
					}
				}

				console.log(`Successfully copied ${insertedCount}/${sourceData.length} documents from ${collectionName}`);
			} catch (collectionError) {
				console.error(`Error processing collection ${collectionName}:`, collectionError);
			}
		}
	} catch (error) {
		console.error(`Error copying collections:`, error);
		throw error;
	}
}

async function seedAutomationDb() {
	console.log('Starting database seeding...');

	let sourceMongo: mongoose.Mongoose | null = null;
	let targetMongo: mongoose.Mongoose | null = null;

	try {
		// Connect to source database using a new mongoose instance
		sourceMongo = new mongoose.Mongoose();
		await sourceMongo.connect(SOURCE_DB_URI, {
			serverSelectionTimeoutMS: 30000,
			connectTimeoutMS: 30000,
		});
		console.log('Connected to source database');

		// Connect to target database using a new mongoose instance
		targetMongo = new mongoose.Mongoose();
		await targetMongo.connect(TARGET_DB_URI, {
			serverSelectionTimeoutMS: 30000,
			connectTimeoutMS: 30000,
		});
		console.log('Connected to target database');

		// Copy collections
		await copyCollections(sourceMongo, targetMongo);

		console.log('Database seeding completed successfully');
	} catch (error) {
		console.error('Error during database seeding:', error);
		throw error;
	} finally {
		// Close connections properly
		try {
			if (sourceMongo) await sourceMongo.disconnect();
			if (targetMongo) await targetMongo.disconnect();
			console.log('Database connections closed');
		} catch (closeError) {
			console.error('Error closing database connections:', closeError);
		}
	}
}

// Run the seed script
seedAutomationDb()
	.then(() => {
		console.log('Seed script execution completed');
		process.exit(0);
	})
	.catch(error => {
		console.error('Seed script failed:', error);
		process.exit(1);
	});
