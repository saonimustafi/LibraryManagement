const express = require('express')
const userRouter = new express.Router()
const userModel = require('../models/users')

// GET Operator - GET all users
userRouter.get('/users', async (request, response) => {
    try {
        console.log('Fetching users...')
        const users = await userModel.find({})
        if(!users) {
            response.status(404).send({"message":"No users found"})
            return
        }
        response.status(200).send(users)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"GET operation failed while fetching user"})
    }
})

// GET Operator - GET user by user id
userRouter.get('/users/:id', async (request, response) => {
    const user_id = request.params.id
    try {
        const user = await userModel.findOne({id: Number(user_id)})
        if(!user) {
            response.status(404).send({"message":"User does not exist"})
            return
        }
        response.status(200).send(user)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"GET operation failed while fetching user"})
    }
})

// GET Operator - Retrieve user information by email id
userRouter.get('/users/searchemail/:email', async (request, response) => {
    const email = request.params.email
    try {
        const user = await userModel.findOne({email: email})
        if(!user) {
            response.status(404).send({"message": "User does not exist"})
            return
        }
        response.status(200).send(user)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"GET operation failed while fetching user"})
    }
})

// POST Operator
userRouter.post('/users/newuser', async (request, response) => {
    try{
        const newUser = new userModel(request.body)
        const user = await userModel.create(newUser)
        response.status(201).send(user)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"POST operation failed while creating user"})
    }
})

// PUT Operator
userRouter.put('/users/updateuser/:id', async (request, response) => {
    try{
        const updateUser = await userModel.findOneAndUpdate({id: request.params.id}, request.body, {new: true})
        response.status(200).send(updateUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"PUT operation failed while updating user"})
    }
})

// DELETE Operator
userRouter.delete('/users/deleteusers/:id', async(request, response) => {
    try {
        const deleteUser = await userModel.findOneAndDelete({id: request.params.id})
        response.status(204).send(deleteUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"DELETE operation failed while deleting user"})
    }
})

module.exports = userRouter