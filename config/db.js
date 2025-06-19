// const mongoose = require('mongoose');
// const dotenv = require('dotenv');

// dotenv.config();

// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.MONGODB_URI); // No options needed
//         console.log('✅ MongoDB Connected');
//     } catch (error) {
//         console.error('❌ MongoDB connection error:', error);
//         process.exit(1);
//     }
// };

// module.exports = connectDB;

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('Connecting to MongoDB URI:', uri); // Debug line
        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
