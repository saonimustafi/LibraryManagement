const express = require('express')
const requestRouter = new express.Router()
const requestModel = require('../models/RaiseRequestSchema')

// GET Operator
requestRouter.get('/requests', async (request, response) => {
    const user = request.params.user_id

    try {
        const requests = await requestModel.findOne({user})
        if(requests && requests.books.length != 0) {
            response.status(200).send(requests)
        }
        else {
            response.send(null)
        }
    }
    catch(error) {
        console.error(error)
        response.send(error)
    }
})

//POST Operator
requestRouter.post('/requests/new-requests')

