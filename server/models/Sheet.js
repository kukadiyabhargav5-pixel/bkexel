const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Sheet1'
  },
  rows: {
    type: Number,
    required: true
  },
  cols: {
    type: Number,
    required: true
  },
  data: {
    type: [[String]],
    default: []
  }
});

const sheetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Untitled Sheet'
  },
  mode: {
    type: String,
    enum: ['custom', 'rowcol'],
    required: true
  },
  tables: [tableSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Sheet', sheetSchema);
