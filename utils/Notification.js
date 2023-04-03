const express = require('express')
const Notification = require('../models/Notification');

Notification.watch().on('change', (change) => {
  if (change.operationType === 'insert') {
    const newNotification = change.fullDocument;
    io.emit('newNotification', newNotification);
  }
});

module.exports = Notification;
