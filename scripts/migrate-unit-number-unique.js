import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Unit from '../models/Unit.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/storageup';

async function migrateUnitNumberUnique() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Find all duplicate unit_numbers
    console.log('\n📊 Finding duplicate unit_numbers...');
    const duplicates = await Unit.aggregate([
      {
        $group: {
          _id: '$unit_number',
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 },
          _id: { $ne: null } // Exclude null/empty values
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found! All unit_numbers are unique.');
    } else {
      console.log(`⚠️  Found ${duplicates.length} duplicate unit_number(s):`);
      
      for (const dup of duplicates) {
        console.log(`\n   Unit Number: "${dup._id}" - Found ${dup.count} records`);
        console.log(`   IDs: ${dup.ids.map(id => id.toString()).join(', ')}`);
      }

      // Step 2: Handle duplicates - keep the first one, append suffix to others
      console.log('\n🔧 Fixing duplicates...');
      let fixedCount = 0;

      for (const dup of duplicates) {
        const unitNumber = dup._id;
        const ids = dup.ids;
        
        // Keep the first record as-is, modify the rest
        for (let i = 1; i < ids.length; i++) {
          const unitId = ids[i];
          const newUnitNumber = `${unitNumber}-${i}`;
          
          try {
            await Unit.findByIdAndUpdate(unitId, {
              $set: { unit_number: newUnitNumber }
            });
            console.log(`   ✓ Updated unit ${unitId} from "${unitNumber}" to "${newUnitNumber}"`);
            fixedCount++;
          } catch (error) {
            console.error(`   ✗ Error updating unit ${unitId}:`, error.message);
          }
        }
      }

      console.log(`\n✅ Fixed ${fixedCount} duplicate unit_number(s)`);
    }

    // Step 3: Drop existing index if it exists (to recreate it properly)
    console.log('\n🗑️  Dropping existing unit_number index if exists...');
    try {
      await Unit.collection.dropIndex('unit_number_1');
      console.log('   ✓ Dropped existing index');
    } catch (error) {
      if (error.code === 27) {
        console.log('   ℹ️  No existing index found (this is okay)');
      } else {
        console.log(`   ℹ️  Index drop result: ${error.message}`);
      }
    }

    // Step 4: Create unique index
    console.log('\n📌 Creating unique index on unit_number...');
    try {
      await Unit.collection.createIndex({ unit_number: 1 }, { unique: true });
      console.log('✅ Successfully created unique index on unit_number');
    } catch (error) {
      console.error('❌ Error creating unique index:', error.message);
      throw error;
    }

    // Step 5: Verify the index
    console.log('\n🔍 Verifying index...');
    const indexes = await Unit.collection.getIndexes();
    if (indexes.unit_number_1) {
      console.log('✅ Unique index verified successfully!');
      console.log('   Index details:', JSON.stringify(indexes.unit_number_1, null, 2));
    } else {
      console.log('⚠️  Warning: Index not found after creation');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUnitNumberUnique();



