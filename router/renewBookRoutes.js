const express = require('express')
renewBookRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")

// PUT Operator - Renew requests for users with book_id
renewBookRouter.put('/activities/renew/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userActivityDetail = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$booksBorrowed", as: "book",
                            cond: {$and: [{$eq: ["$$book.book_id", Number(book_id)]}, {$eq: ["$$book.actualReturnDate", null]}]}}
                    }
                }}
        ])

        if(!userActivityDetail) {
            response.status(404).send({"message":"No current activity exists for the user"})
            return
        }

        const booksBorrowDetail = await userActivityDetail[0].books.find(book => book.book_id === Number(book_id))

        if(!booksBorrowDetail) {
            response.send(404).status({"message":"Book not found in user's activity"})
        }

        const currentDate = new Date(Date.now())
        const returnDate = booksBorrowDetail.returnDate

        if(currentDate <= returnDate) {
            // Change the returnDate to two months more than the currentDate
            const newReturnDate = new Date(returnDate)

            const newReturnYear = newReturnDate.getFullYear()
            const newReturnMonth = newReturnDate.getMonth() + 1
            const newReturnDay = newReturnDate.getDate() + 1

            const newReturnDateString = `${newReturnYear}-${newReturnMonth}-${newReturnDay}`
            const newReturnDateForUser = new Date(newReturnDateString)

            await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id), "booksBorrowed.actualReturnDate": null},
                {$set:
                        {"booksBorrowed.$.returnDate": newReturnDateForUser}
                }
            )
            const newUserActivityDetail = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                    {books: {$filter: {input: "$booksBorrowed", as: "book",
                                cond: {$eq: ["$$book.book_id", Number(book_id)]}}
                        }
                    }}
            ])
            response.status(200).send({"newReturnDate": newReturnDateForUser})
        }
        else {
            response.status(400).send({"message":"Please return the book and pay the fine. Then you can raise a request to borrow the book"})
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"PUT Operation failed while renewing requests for users with book id"})
    }
})

module.exports = renewBookRouter