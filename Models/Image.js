const mongoose = require('mongoose');
const {Schema} = mongoose;

const imageSchema = new Schema({
  url: String,
  createAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Image', imageSchema);