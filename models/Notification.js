const mongoose = require('mongoose')
const notificationSchema = new mongoose.Schema({
    message: String,
    timestamp: { type: Date, default: Date.now },
    userId: String,
    bookId: String,
    read: Boolean
  });

const Notification = mongoose.model('Notification', notificationSchema)
module.exports = Notification

