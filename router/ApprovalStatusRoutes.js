const express = require('express')
const approveRouter = express.Router()
const requestModel = require('../models/request')
const userModel = require('../models/users')
const userActivitiesModel = require('../models/UserActivities')
const bookModel = require("../models/books")
const maxBooks = 6;

// GET Operator - Get all the pending requests
approveRouter.get("/allpendingrequests", async(request, response) => {
    try {
        const approvalRequests = await requestModel.find({"books.approvalStatus": "Pending"})

        if(!approvalRequests) {
            response.status(404).send("No requests pending to approve")
            return
        }
        response.status(200).send(approvalRequests)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET operation failed while retrieving approval requests")
    }
})

// GET Operator - Get all the requests of users
approveRouter.get("/allrequests", async(request, response) => {
    try {
        const approvalRequests = await requestModel.find({})
        if(!approvalRequests) {
            response.status(404).send("No requests pending to approve")
            return
        }
        response.status(200).send(approvalRequests)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET operation failed while retrieving approval requests")
    }
})

// GET Operator - Get all pending requests of a user
approveRouter.get("/allpendingrequests/:user_id", async(request, response) => {
    const user_id = request.params.user_id
    try {
        const pendingRequestsForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {
                    $filter: {
                        input: "$books",
                        as: "book",
                        cond: { $eq: ["$$book.approvalStatus", "Pending"] }
                        }
                    }
                }
            }])
        if(!pendingRequestsForUser) {
            response.status(404).send("No requests pending to approve")
            return
        }
        response.status(200).send(pendingRequestsForUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET operation failed while retrieving approval requests")
    }
})

// GET Operator - Get all requests of a user
approveRouter.get("/allrequests/:user_id", async(request, response) => {
    const user_id = request.params.user_id
    try {
        const approvalRequestsForUser = await requestModel.findOne({user_id: user_id})
        if(!approvalRequestsForUser) {
            response.status(404).send("No requests pending to approve")
            return
        }
        response.status(200).send(approvalRequestsForUser.books)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET operation failed while retrieving approval requests")
    }
})

// PUT Operator - Bulk approve/decline for a user
approveRouter.put("/bulkapproverequests/:user_id", async(request, response) => {
    const user_id = request.params.user_id

    try {
        const userDetail = await userModel.findOne({id: user_id})

        const pendingRequestsForUser = await requestModel.aggregate([
            {$match: {"user_id": Number(user_id)}},
            {$unwind: "$books"},
            {$match: {"books.approvalStatus": "Pending"}},
            {$group: {_id: "$_id",books: {$push: "$books"}}},
            {$project: { _id: 0,books: 1}}
        ])

        const approvedRequestsForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {
                        $filter: {
                            input: "$books",
                            as: "book",
                            cond: {
                                $and: [
                                    {$eq: ["$$book.approvalStatus", "Approved"]},
                                    {$eq: ["$$book.checkOutDate", null]}
                                ]
                            }
                        }
                    }
                }
        }])



        const userActivities = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}},{$project:
                    {booksBorrowed: {
                        $filter: {
                            input: "$booksBorrowed",
                            as: "borrowed",
                            cond: {$gt: ["$$borrowed.returnDate", Date.now()]}
                        }
                        }
                    }
            }
        ])

        const userBooksRequests = pendingRequestsForUser[0].books.length

        // If pending approval requests don't exist for the user
        if(!pendingRequestsForUser || userBooksRequests == 0) {
            response.status(404).send("Requests don't exist for the user:"+userDetail.name)
            return
        }


        const approvedBooks = approvedRequestsForUser[0].books.length
        const booksCheckedOut = (userActivities.length == 0)? 0 : userActivities[0].booksBorrowed.length


        // If the user has already borrowed the maximum books, decline the request
        if(userActivities.length == 0 && (booksCheckedOut == maxBooks || approvedBooks == maxBooks || booksCheckedOut + approvedBooks == maxBooks)) {
            for (let bookIndex = 0; bookIndex < userBooksRequests; bookIndex++) {

                if(pendingRequestsForUser[0].books[bookIndex].approvalStatus == 'Pending') {
                    await requestModel.updateOne({user_id: user_id, "books.book_id": pendingRequestsForUser[0].books[bookIndex].book_id},
                        { $set: {
                                "books.$.approvalStatus" : 'Declined',
                                "books.$.approvedOrRejectedDate" : Date.now(),
                                "books.$.comments" : "Request declined as you have reached the limit"
                            }
                        }
                    )
                    // For every request declined, add the book to the inventory
                    let book_id = pendingRequestsForUser[0].books[bookIndex].book_id
                    await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
                }
            }

            response.status(200).send("Requests declined for user: "+userDetail.name)
            return
        }


        // If the user has borrowed less than maxBooks, approve the first (MaxBook - booksBorrowed - alreadyApprovedBooks) requests and decline the remaining requests
        else if((userActivities.length == 0) || (booksCheckedOut < maxBooks && approvedBooks + booksCheckedOut < maxBooks )) {

            const permittedBooksLimit = Math.min(maxBooks - booksCheckedOut - approvedBooks, userBooksRequests)

            for (let bookIndex = 0; bookIndex < permittedBooksLimit; bookIndex++) {
                if(pendingRequestsForUser[0].books[bookIndex].approvalStatus == 'Pending') {
                    await requestModel.updateOne({user_id: user_id, "books.book_id": pendingRequestsForUser[0].books[bookIndex].book_id},
                        { $set: {
                                        "books.$.approvalStatus" : 'Approved',
                                        "books.$.approvedOrRejectedDate" : Date.now(),
                                        "books.$.comments" : "Book is ready for checkout"
                            }
                        }
                    )
                }
            }
            // Decline the remaining requests for the user and add the books in the inventory
            for(let bookIndex = permittedBooksLimit; bookIndex < userBooksRequests; bookIndex++) {
                if(pendingRequestsForUser[0].books[bookIndex].approvalStatus == 'Pending') {
                    await requestModel.updateOne({user_id: user_id, "books.book_id": pendingRequestsForUser[0].books[bookIndex].book_id},
                        { $set: {
                                "books.$.approvalStatus" : 'Declined',
                                "books.$.approvedOrRejectedDate" : Date.now(),
                                "books.$.comments" : "Request declined as you have reached the limit"
                            }
                        }
                    )

                    // For every declined request, increase the book count in the inventory
                    // let book_id = userBooksRequests[bookIndex].book_id
                    let book_id = pendingRequestsForUser[0].books[bookIndex].book_id
                    await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
                }
            }
            response.status(200).send("First " + permittedBooksLimit + " requests approved for user: "+userDetail.name)
            return
        }
    }
    catch (error) {
        console.error(error)
        response.status(500).send("PUT operation failed while approving/declining user request")
    }
})



// PUT Operator - Approve/Decline by Book ID
approveRouter.put("/approverequests/:user_id/:book_id", async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userDetail = await userModel.findOne({id: user_id})

        const pendingRequestsForUser = await requestModel.aggregate([
            {$match: {"user_id": Number(user_id)}},
            {$unwind: "$books"},
            {$match: {"books.approvalStatus": "Pending"}},
            {$group: {_id: "$_id", books: {$push: "$books"}}},
            {$project: {_id: 0,books: 1}}
        ])

        const approvedRequestsForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {$filter: {input: "$books", as: "book",
                            cond: {$and: [{$eq: ["$$book.approvalStatus", "Approved"]},{$eq: ["$$book.checkOutDate", null]}]}}
                        }
                }
        }])


        const userActivities = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}},{$project:
                {booksBorrowed: { $filter: {input: "$booksBorrowed",as: "borrowed",
                            cond: {$gt: ["$$borrowed.returnDate", Date.now()]}}
                            }
                }
        }])


        const book = await bookModel.findOne({id: book_id})

        const userBooksRequests = pendingRequestsForUser[0].books.length

        // If there are no pending requests for a user
        if(!pendingRequestsForUser || userBooksRequests == 0) {
            response.status(404).send("Requests don't exist for the user:"+userDetail.name)
            return
        }

        // If the book is not present in the requests raised by the user
        const bookRequest = await requestModel.find({user_id: user_id, "books.book_id": Number(book_id)})
        if(!bookRequest) {
            response.status(404).send("Book request for book: "+ book.name +" does not exist for user: "+userDetail.name)
            return
        }

        const booksCheckedOut = (userActivities.length == 0)? 0 : userActivities[0].booksBorrowed.length //numberOfBooksBorrowed
        const approvedBooks = approvedRequestsForUser[0].books.length

        // If the user has already borrowed maximum books, decline the request and add the book to the inventory
        if(booksCheckedOut == maxBooks || approvedBooks == maxBooks || booksCheckedOut + approvedBooks == maxBooks) {
            if(pendingRequestsForUser[0].books[0].approvalStatus == "Pending") {

                // { user_id: 1, books: { $elemMatch: { book_id: 3 } } },
                // { "books.$": 1 }


                // await requestModel.updateOne({user_id: Number(user_id), "books.book_id": pendingRequestsForUser[0].books[0].book_id},
                //     {
                //         $set: {
                //                 "books.$.approvalStatus": "Declined",
                //                 "books.$.approvedOrRejectedDate": Date.now(),
                //                 "books.$.comments": "You have already borrowed maximum books. Request declined"
                //             }
                //     }
                // )

                // await requestModel.updateOne({user_id: Number(user_id), "books": { $elemMatch: {"book_id": pendingRequestsForUser[0].books[0].book_id}}}, {"books.$":1},
                //     {
                //         $set: {
                //             "books.$.approvalStatus": "Declined",
                //             "books.$.approvedOrRejectedDate": Date.now(),
                //             "books.$.comments": "You have already borrowed maximum books. Request declined"
                //         }
                //     }
                // )

                await requestModel.updateOne({user_id: user_id, "books.book_id": pendingRequestsForUser[0].books[0].book_id},{ $set: {
                            "books.$.approvalStatus" : "Declined",
                            "books.$.approvedOrRejectedDate" : Date.now(),
                            "books.$.comments" : "Request declined as you have reached the limit"
                        }
                    }
                )

                await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
                response.status(200).send("Request declined for user: " + userDetail.name + " as maximum books have been borrowed.")
                return
            }
        }

        // If the user has not yet reached the maximum number, approve the request
        else if (booksCheckedOut < maxBooks && approvedBooks < maxBooks - booksCheckedOut && approvedBooks + booksCheckedOut < maxBooks) {
            await requestModel.updateOne({user_id: user_id, "books.book_id": book_id},
                {$set:
                        {"books.$.approvalStatus": 'Approved',
                         "books.$.approvedOrRejectedDate": Date.now(),
                         "books.$.comments": "Request approved. Ready for checkout"
                        }
                }
            )
            response.status(200).send("Request has been approved for book: " + book.name + " user: "+ userDetail.name)
            return
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT operation failed while approving/declining user request for the book")
    }
})

// PUT Operator - To approve individual request
approveRouter.put('/requests/approveindividualrequest/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userDetail = await userModel.findOne({id: user_id})
        const approvalRequestsForUser = await requestModel.findOne({user_id: user_id, "books.book_id": book_id, "books.approvalStatus": "Pending"})
        const userActivities = await userActivitiesModel.findOne({user_id: user_id, "booksBorrowed.$.returnDate": {$gt: Date.now()} })

        if(!approvalRequestsForUser || approvalRequestsForUser.books.length == 0) {
            response.status(404).send("Requests don't exist for the user:"+userDetail.name)
            return
        }

        const userBooksRequests = approvalRequestsForUser.books

        if(userActivities !== null && userActivities.booksBorrowed.length == maxBooks) {
            response.status(200).send("Please decline the request as the user has already borrowed maximum books")
            return
        }
        else if (userActivities.booksBorrowed.length < maxBooks && userActivities.booksBorrowed.length + 1 <= maxBooks) {
            await requestModel.updateOne({user_id: user_id, "books.book_id": book_id},
                {$set:
                        {"books.$.approvalStatus": 'Approved',
                            "books.$.approvedOrRejectedDate": Date.now(),
                            "books.$.comments": "Request approved. Ready for checkout"
                        }
                }
            )
            response.status(200).send("Request has been approved for book: " + book.name + " user: "+ userDetail.name)
            return
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT operation failed while approving user request for the book")
    }
})

// PUT Operator - To decline individual request
approveRouter.put('/requests/declineindividualrequest/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userDetail = await userModel.findOne({id: user_id})
        const approvalRequestsForUser = await requestModel.findOne({user_id: user_id, "books.book_id": book_id, "books.approvalStatus": "Pending"})
        const userActivities = await userActivitiesModel.findOne({user_id: user_id, "booksBorrowed.$.returnDate": {$gt: Date.now()} })

        if(!approvalRequestsForUser || approvalRequestsForUser.books.length == 0) {
            response.status(404).send("Requests don't exist for the user:"+userDetail.name)
            return
        }

        const userBooksRequests = approvalRequestsForUser.books

        if(userActivities !== null && userActivities.booksBorrowed.length == maxBooks) {
            await requestModel.updateOne({user_id: user_id, "books.book_id": book_id},
                {$set:
                        {"books.$.approvalStatus": 'Declined',
                            "books.$.approvedOrRejectedDate": Date.now(),
                            "books.$.comments": "You already have maximum books borrowed"
                        }
                }
            )
            await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
            response.status(200).send("The user has already borrowed maximum books")
            return
        }

        await requestModel.updateOne({user_id: user_id, "books.book_id": book_id},
            {$set:
                    {"books.$.approvalStatus": 'Declined',
                        "books.$.approvedOrRejectedDate": Date.now(),
                        "books.$.comments": "You already have maximum books borrowed"
                    }
            }
        )
        await bookModel.updateOne({id: book_id}, {$inc: {count: +1}})
        response.status(200).send("Request declined")
        return
    }
    catch(error) {
        console.error(error)
        response.status(500).send("PUT operation failed while approving user request for the book")
    }
})

module.exports = approveRouter