const express = require('express')
const checkOutRouter = express.Router()
const requestModel = require('../models/request')
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")

// GET Operator - Get all past and current activities of a user
checkOutRouter.get('/requests/checkout/:user_id', async(request, response) => {
    const user_id = request.params.user_id
    try {
        const userDetail = await userModel.findOne({id: user_id})
        const userActivityDetail = await userActivitiesModel.findOne({user_id: user_id})

        // If no activity for the user exists
        if(!userActivityDetail) {
            response.status(404).send("No activity found for user: "+userDetail.name)
            return
        }
        response.status(200).send(userActivityDetail)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET Operation failed while retrieving activity information for the user")
    }
})

// PUT Operator - User tries to check out the approved book requests
checkOutRouter.put('/checkout/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id
    try {
        const userDetail = await userModel.findOne({id: user_id})
        const bookDetail = await bookModel.findOne({id: book_id})
        const approvedBookRequest = await requestModel.findOne({user_id: user_id, "books.book_id": book_id, "books.approvalStatus": 'Approved'})

        // If there are no approved requests for the user
        if(!approvedBookRequest) {
            response.status(404).send("There are no approved requests for the user")
            return
        }

        // Calculate the return date of the book for the user based on the check-out date
        const checkOutDateForUser = Date.now();

        const currentDate = new Date(checkOutDateForUser)
        currentDate.setMonth(currentDate.getMonth()+3)
        const returnYear = currentDate.getFullYear()
        const returnMonth = currentDate.getMonth() + 1
        const returnDay = currentDate.getDate()

        const returnDateString = `${returnYear}-${returnMonth}-${returnDay}`
        const returnDateForUser = new Date(returnDateString)

        // Create the object of the new book borrowed and update the same in MongoDB
        const userDetailsPresent  = await userActivitiesModel.findOne({user_id: user_id})

        let newBooksBorrowed = {
            "book_id": book_id,
            "checkOutDate": checkOutDateForUser,
            "returnDate": returnDateForUser
        }
        let newCheckOutForUser = {
            "user_id": user_id,
            "booksBorrowed" : [newBooksBorrowed]
        }

        //If the user id is checking out book for the first time - create a new record for
        // the user in the userActivity and update the checkOut date in the request model
        if(!userDetailsPresent) {
            await userActivitiesModel.create(newCheckOutForUser)
            await approvedBookRequest.updateOne({user_id: user_id, "books.book_id": book_id},
                {$set :
                        {"books.$.checkOutDate": checkOutDateForUser}
                }
            )

            response.status(201).send("New check-out request created with book: " + bookDetail.name + " for the user: "+userDetail.name)
            return
        }

        // If the user id is present and has past records - Update the request model and
        // push the new request to the existing user id in the userActivity model and  the request model
        else {
            userDetailsPresent.booksBorrowed.push(newBooksBorrowed)
            await userDetailsPresent.save()

            await approvedBookRequest.updateOne({user_id: user_id, "books.book_id": book_id},
                {$set :
                        {"books.$.checkOutDate": checkOutDateForUser}
                }
            )

            response.status(201).send("Check-out request updated with book: " + bookDetail.name + " for the user: "+userDetail.name)
            return
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT Operation failed while checking out for the user")
    }
})