const express = require('express')
const FineRouter = express.Router()
const userActivitiesModel = require('../models/UserActivities')
// const userModel = require('../models/users')
const finePerDay = 2

FineRouter.get('/getfinedetails/:user_id', async(request, response) => {
    const user_id = request.params.user_id

    try {
        const userActivityDetail = await userActivitiesModel.find({user_id: Number(user_id)})

        if(userActivityDetail.length == 0 ) {
            response.status(404).send({"message":"No fine details exist for this user"})
            return
        }

        const booksBorrowedDetail = userActivityDetail[0].booksBorrowed

        const currentDate = new Date(Date.now())
        currentDate.setHours(0,0,0,0)

        for(let bookIndex = 0; bookIndex < booksBorrowedDetail.length; bookIndex++) {
            var book_id = booksBorrowedDetail[bookIndex].book_id

            if(booksBorrowedDetail[bookIndex].finePaid === false && booksBorrowedDetail[bookIndex].actualReturnDate === null && currentDate > booksBorrowedDetail[bookIndex].returnDate) {
                var returnDate = userActivityDetail[0].booksBorrowed[bookIndex].returnDate

                var DiffInMS = currentDate - returnDate
                var DiffInDays = Math.floor(DiffInMS/(1000 * 60 * 60 * 24))

                const currentFine = DiffInDays * finePerDay

                await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                    {$set: {"booksBorrowed.$.fineToPay": currentFine}})

            }
            else if(booksBorrowedDetail[bookIndex].finePaid === false && booksBorrowedDetail[bookIndex].actualReturnDate === null && currentDate < booksBorrowedDetail[bookIndex].returnDate) {
                await userActivitiesModel.updateOne({user_id: Number(user_id), "booksBorrowed.book_id": Number(book_id)},
                    {$set: {"booksBorrowed.$.fineToPay": 0}})
            }
        }

        const userFineDetail = await userActivitiesModel.find({user_id: Number(user_id)})

        response.status(200).send(userFineDetail)
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"GET Operation failed while fetching fine details for the user"})
    }
})

module.exports = FineRouter