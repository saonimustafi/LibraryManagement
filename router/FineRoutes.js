const express = require('express')
const FineRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
// const userModel = require('../models/users')
// const bookModel = require("../models/books")
// const requestModel = require("../models/request")
const finePerDay = 2

FineRouter.get('/getfinedetails/:user_id', async(request, response) => {
    const user_id = request.params.user_id

    try {
        const userActivityDetail = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$booksBorrowed", as: "book",cond: {$eq: ["$$book.actualReturnDate", null]}}}}}
        ])

        if(!userActivityDetail) {
            response.status(404).send({"message":"No book borrowing history exists for this user"})
            return
        }
        const booksBorrowedDetail = userActivityDetail[0].books

        const currentDate = new Date(Date.now())
        currentDate.setHours(0,0,0,0)


        for(let bookIndex = 0; bookIndex < booksBorrowedDetail.length; bookIndex++) {
            var book_id = userActivityDetail[0].books[bookIndex].book_id

            if(currentDate > userActivityDetail[0].books[bookIndex].returnDate) {
                var returnDate = userActivityDetail[0].books[bookIndex].returnDate

                var DiffInMS = currentDate.getTime() - returnDate.getTime()
                var DiffInDays = Math.floor(DiffInMS/(1000 * 60 * 60 * 24))

                const currentFine = DiffInDays * finePerDay

                await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                    {$set: {"booksBorrowed.$.fineToPay": currentFine}})

            }
            else {
                await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                    {$set: {"booksBorrowed.$.fineToPay": 0}})
            }
        }

        const userFineDetail = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$booksBorrowed", as: "book",cond: {$eq: ["$$book.actualReturnDate", null]}}}}}
        ])

        response.status(200).send(userFineDetail)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"GET Operation failed while fetching fine details for the user"})
    }
})

module.exports = FineRouter