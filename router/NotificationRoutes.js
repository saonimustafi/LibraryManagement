const express = require('express')
const NotificationRoutes = express.Router()
const notificationModel = require('../models/Notification')

NotificationRoutes.get('/notifications/:userId', async (req, res) => {
    const userId = req.params.userId
	try {
		const notifications = await notificationModel.find({userId: parseInt(userId)}).sort({ timestamp: -1 })
		// return res.json({ status: 'ok', email: user.email })
		res.status(200).send({status: 'ok', notifications: notifications})
	} catch (error) {
		console.log(error)
		// res.json({ status: 'error', error: 'invalid token' })
		res.status(500).send({error: 'Error occurred while fetching notifications'})
	}
})

NotificationRoutes.post('/notifications', async (req, res) => {
	console.log(req.body)
	try {
		const newNotification = new notificationModel({
            id: Math.floor(Math.random() * 1000000),
            message: req.body.message,
			userId: req.body.userId,
            bookId: req.body.bookId
		})
        const notification = await notificationModel.create(newNotification)
		return res.status(201).send({ status: 'ok', notification: notification })
	} catch (err) {
		// res.json({ status: 'error', error: 'Duplicate email' })
		return res.status(500).send({"message":"POST operation failed while creating new notification"})
	}
})

// Mark a notification as read
NotificationRoutes.put('/notifications/:notificationId', async (req, res) => {
    const notificationId = req.params.notificationId;
	try {
        const updatedNotification = await notificationModel.updateOne({id: notificationId},{$set : {read : true}})
        return res.status(200).send({ status: 'ok', notification: updatedNotification }) 
	} catch (err) {
		// res.json({ status: 'error', error: 'Duplicate email' })
		return res.status(500).send({"message":"PUT operation failed while creating new notification"})
	}
})

module.exports = NotificationRoutes