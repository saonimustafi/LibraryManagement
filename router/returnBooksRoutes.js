const express = require('express')
const returnBooksRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")
const finePerDay = 2

// PUT Operator - Update the return date in the system for the user for a book
returnBooksRouter.put('/activities/return/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userActivityDetail = await userActivitiesModel.findOne({user_id: user_id, "booksBorrowed.book_id": book_id, "booksBorrowed.actualReturnDate": null})
        const userDetail = await userModel.findOne({id: user_id})

        // If no current activity is found for the user
        if(!userActivityDetail) {
            response.status(404).send("No books have been borrowed by the user: "+userDetail.name)
            return
        }

        const booksBorrowedDetail = await userActivityDetail.booksBorrowed.find(book => book.book_id == book_id)

        // If the book id does not exist in the current user activity
        if(!booksBorrowedDetail) {
            response.status(404).send("Book not found in user's activity")
        }

        // Calculate the fine based on the number of days elapsed between the returnDate and the actualReturnDate
        const actualReturnDate = Date.now()
        actualReturnDate.setHours(0,0,0,0)
        const returnDate = new Date(booksBorrowedDetail.returnDate)
        returnDate.setHours(0,0,0,0)

        const DiffInMS = actualReturnDate.getTime() - returnDate.getTime()
        const DiffInDays = Math.floor(DiffInMS/(1000 * 60 * 60 * 24))

        const fineForBook = DiffInDays * finePerDay

        // Update the actualReturnDate and fineToPay in the userActivity model
        await userActivitiesModel.updateOne({user_id: user_id, "booksBorrowed.book_id": book_id},
            {$set: {
                    "booksBorrowed.$.actualReturnDate": actualReturnDate,
                    "booksBorrowed.$.fineToPay": fineForBook
                }
            }
        )

        // Increase the count of the book in the book inventory after the return
        await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT operation failed while returning the book to the library")
    }
})

module.exports = returnBooksRouter
