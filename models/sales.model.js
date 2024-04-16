const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the Sales model
const salesSchema = new Schema({
  referrer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Create the Sales model
const Sales = mongoose.model('Sales', salesSchema);

// Export the model
module.exports = Sales;
