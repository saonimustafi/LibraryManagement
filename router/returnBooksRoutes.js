const express = require('express')
const returnBooksRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")
const requestModel = require("../models/request");
const finePerDay = 2

// PUT Operator - Update the return date in the system for the user for a book
returnBooksRouter.put('/return/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        // const userActivityDetail = await userActivitiesModel.findOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id), "booksBorrowed.actualReturnDate": null})

        const userActivityDetail = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$booksBorrowed", as: "book",
                            cond: {$and: [{$eq: ["$$book.book_id", Number(book_id)]}, {$eq: ["$$book.actualReturnDate", null]}]}}
                    }
                }}
        ])

        const userDetail = await userModel.findOne({id: Number(user_id)})

        // If no current activity is found for the user
        if(!userActivityDetail) {
            response.status(404).send({"message":`No books have been borrowed by the user: ${userDetail.name}`})
            return
        }

        const booksBorrowedDetail = userActivityDetail[0].books.find(book => book.book_id === Number(book_id))

        // If the book id does not exist in the current user activity
        if(!booksBorrowedDetail) {
            response.status(404).send({"message":"Book not found in user's activity"})
            return
        }

        const actualReturnDate = Date.now()
        const actualBookReturnDate = new Date(actualReturnDate)
        actualBookReturnDate.setHours(0,0,0,0)

        const returnDate = new Date(booksBorrowedDetail.returnDate)

        // Calculate the fine based on the number of days elapsed between the returnDate and the actualReturnDate. If the
        // actualReturnDate > returnDate, then pay the fine and then return the book.

        if(actualReturnDate > returnDate) {
            // Update the actualReturnDate and fineToPay in the userActivity model

            const DiffInMS = actualReturnDate.getTime() - returnDate.getTime()
            const DiffInDays = Math.floor(DiffInMS/(1000 * 60 * 60 * 24))

            const fineForBook = DiffInDays * finePerDay

            await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                {
                    $set: {
                        "booksBorrowed.$.actualReturnDate": actualReturnDate,
                        "booksBorrowed.$.fineToPay": fineForBook,
                        "booksBorrowed.$.finePaid": true
                    }
                }
            )
        }

        else {
            await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                {
                    $set: {
                        "booksBorrowed.$.actualReturnDate": actualReturnDate,
                        "booksBorrowed.$.fineToPay": 0
                    }
                }
            )
        }

        // Update the comments in the request model
        await requestModel.updateOne({user_id: Number(user_id), "books.book_id": Number(book_id)},
            {$set :
                    {"books.$.comments": "Book has been returned by the user"}
            }
        )

        // Increase the count of the book in the book inventory after the return
        await bookModel.updateOne({id: Number(book_id)}, {$inc: {count: +1}})

        response.status(200).send({"actualReturnDate":actualReturnDate})
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"PUT operation failed while returning the book to the library"})
    }
})

module.exports = returnBooksRouter
