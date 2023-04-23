const mongoose = require('mongoose')
const notificationSchema = new mongoose.Schema({
    id: {
      type: Number,
      required: true,
      unique: true
    },
    message: String,
    timestamp: { type: Date, default: Date.now },
    userId: Number,
    read: { type: Boolean, default: false }
  });

const Notification = mongoose.model('Notification', notificationSchema)
module.exports = Notification

