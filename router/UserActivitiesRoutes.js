const express = require('express')
const UserActivitiesRouter = express.Router()
const requestModel = require('../models/request')
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")
const jwt = require('jsonwebtoken')
const User = require('../models/user')

// GET Operator - Get all past and current activities of a user
UserActivitiesRouter.get('/checkout/:user_id', async(request, response) => {
    const token = request.headers['x-access-token']	
    const mockData = {
        "user_id": 1,
        "books": [
          {
            "bookName": "The Great Gatsby",
            "dateRequested": "2021-03-09",
            "approvalDate": "2021-03-10",
            "approvalStatus": "Approved",
            "checkoutDate": "03/11/2021",
            "returnDate": "04/11/2021",
            "actualReturnDate": "04/11/2021",
            "fineToPay": 0
          },
          {
            "bookName": "To Kill a Mockingbird",
            "dateRequested": "03/10/2021",
            "approvalDate": "03/11/2021",
            "approvalStatus": "Approved",
            "checkoutDate": "03/12/2021",
            "returnDate": "04/12/2021",
            "actualReturnDate": "04/20/2021",
            "fineToPay": 16
          }
        ]
      };
    
    try {
		const decoded = jwt.verify(token, 'secret123')
		const email = decoded.email
		// const user = await User.findOne({ email: email })

		return response.json({ status: 'ok', userActivities: mockData })
	} catch (error) {
		console.log(error)
		response.json({ status: 'error', error: 'invalid token' })
	}

    // response.status(200).send(mockData);



    // const user_id = request.params.user_id
    // try {
    //     const userDetail = await userModel.findOne({id: user_id})
    //     const userActivityDetail = await userActivitiesModel.findOne({user_id: user_id})

    //     // If no activity for the user exists
    //     if(!userActivityDetail) {
    //         response.status(404).send("No activity found for user: "+userDetail.name)
    //         return
    //     }
    //     response.status(200).send(userActivityDetail)
    // }
    // catch(error) {
    //     console.error(error)
    //     response.status(500).send("GET Operation failed while retrieving activity information for the user")
    // }
})

// PUT Operator - User tries to check out the approved book requests
UserActivitiesRouter.put('/checkout/:user_id/:book_id', async(request, response) => {
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

module.exports = UserActivitiesRouter