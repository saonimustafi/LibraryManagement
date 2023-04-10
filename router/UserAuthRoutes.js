const express = require('express')
const UserAuthRoutes = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const userModel = require('../models/users')

UserAuthRoutes.post('/users/newuser', async (req, res) => {
	console.log(req.body)
	try {
		const newPassword = await bcrypt.hash(req.body.password, 10)

		const newUser = new userModel({
			id: Math.floor(Math.random() * 1000000),
			name: req.body.name,
			email: req.body.email,
			password: newPassword
		})
        const user = await userModel.create(newUser)
		return res.status(201).send({ status: 'ok', user: user })
	} catch (err) {
		// res.json({ status: 'error', error: 'Duplicate email' })
		return res.status(500).send({"message":"POST operation failed while creating user"})
	}
})

UserAuthRoutes.post('/users/newadminuser', async (req, res) => {
	console.log(req.body)
	try {
		const newPassword = await bcrypt.hash(req.body.password, 10)

		const newUser = new userModel({
			id: Math.floor(Math.random() * 1000000),
			name: req.body.name,
			email: req.body.email,
			password: newPassword,
			role: 'admin'
		})
        const user = await userModel.create(newUser)
		return res.status(201).send({ status: 'ok', user: user })
	} catch (err) {
		// res.json({ status: 'error', error: 'Duplicate email' })
		return res.status(500).send({"message":"POST operation failed while creating user"})
	}
})

UserAuthRoutes.post('/users/login', async (req, res) => {
	const user = await userModel.findOne({
		email: req.body.email,
	})

	if (!user) {
		return { status: 'error', error: 'Invalid login' }
	}

	const isPasswordValid = await bcrypt.compare(
		req.body.password,
		user.password
	)

	if (isPasswordValid) {
		const token = jwt.sign(
			{
				name: user.name,
				email: user.email,
				id: user.id,
				role: user.role
			},
			'secret123'
		)
		res.status(200).send({user: token})
		// return res.json({ status: 'ok', user: token })
	} else {
		res.status(400).send({user: false})
		// return res.json({ status: 'error', user: false })
	}
})


UserAuthRoutes.get('/checkLoggedIn', async (req, res) => {
	const token = req.headers['x-access-token']
	try {
		const decoded = jwt.verify(token, 'secret123')
		const email = decoded.email
		const user = await userModel.findOne({ email: email })
		// return res.json({ status: 'ok', email: user.email })
		res.status(200).send({status: 'ok', email: user.email, name: user.name, id: user.id, role: user.role})
	} catch (error) {
		console.log(error)
		// res.json({ status: 'error', error: 'invalid token' })
		res.status(401).send({error: 'invalid token'})
	}
})


module.exports = UserAuthRoutes