const express = require('express')
renewBookRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
const userModel = require('../models/users')
const bookModel = require("../models/books")

// PUT Operator - Renew requests for users with book_id
renewBookRouter.put('/activities/renew/user_id/book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userActivityDetail = await userActivitiesModel.find({user_id: user_id, "booksBorrowed.book_id": book_id, "booksBorrowed.actualReturnDate": null})

        if(!userActivityDetail) {
            response.status(404).send("No current activity exists for the user")
            return
        }

        const booksBorrowDetail = await userActivityDetail.booksBorrowed.find(book => book.book_id == book_id)

        if(!booksBorrowDetail) {
            response.send(404).status("Book not found in user's activity")
        }

        const currentDate = Date.now()
        const returnDate = booksBorrowDetail.returnDate

        if(currDate <= returnDate) {
            // Change the returnDate to two months more than the currentDate
            const newReturnDate = new Date(returnDate)
            newReturnDate.setMonth(currentDate.getMonth()+3)
            const newReturnYear = currentDate.getFullYear()
            const newReturnMonth = currentDate.getMonth() + 1
            const newReturnDay = currentDate.getDate()

            const newReturnDateString = `${newReturnYear}-${newReturnMonth}-${newReturnDay}`
            const newReturnDateForUser = new Date(newReturnDateString)

            await userActivityDetail.updateOne({user_id: user_id, "booksBorrowed.book_id": book_id, "booksBorrowed.actualReturnDate": null},
                {$set:
                        {"booksBorrowed.$.returnDate": newReturnDateForUser}
                }
            )
            response.status(200).send(userActivityDetail)
        }
        else {
            response.status(400).send("Please return the book and pay the fine. Then you can raise a request to borrow the book")
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT Operation failed while renewing requests for users with book id")
    }
})

module.exports = renewBookRouter