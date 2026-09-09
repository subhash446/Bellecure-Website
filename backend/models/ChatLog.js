const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: false,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.ChatLog || mongoose.model('ChatLog', chatLogSchema);
