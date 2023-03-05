const express = require('express')
const userRouter = new express.Router()
const userModel = require('../models/users')

// GET Operator
userRouter.get('/users', async (request, response) => {
    try {
        console.log('Fetching users...')
        const users = await userModel.find({})
        response.status(200).send(users)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('GET operation failed while fetching user')
    }
})

// POST Operator
userRouter.post('/users/newUser', async (request, response) => {
    try{
        const newUser = new userModel(request.body)
        const user = await userModel.create(newUser)
        response.status(201).send(user)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('POST operation failed while creating user')
    }
})

// PUT Operator
userRouter.put('/users/updateUser/:id', async (request, response) => {
    try{
        const updateUser = await userModel.findOneAndUpdate({id: request.params._id}, request.body, {new: true})
        response.status(200).send(updateUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('PUT operation failed while updating user')
    }
})

// DELETE Operator
userRouter.delete('/users/deleteUsers/:id', async(request, response) => {
    try {
        const deleteUser = await userModel.findOneAndDelete({id: request.params._id})
        response.status(204).send(deleteUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('DELETE operation failed while deleting user')
    }
})

module.exports = userRouter