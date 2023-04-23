const express = require('express')
const approveRouter = express.Router()
const requestModel = require('../models/request')
const userModel = require('../models/users')
const userActivitiesModel = require('../models/UserActivities')
const bookModel = require("../models/books")
const maxBooks = 6;

const socketIO = require('../utils/socket');
const Notification = require('../models/Notification');

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

approveRouter.get("/allrequests/:user_id/:book_id", async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const bookRequestForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {
                        $filter: {
                            input: "$books",
                            as: "book",
                            cond: {
                                $and:[
                                    {$eq: ["$$book.book_id", Number(book_id)]},
                                    {$eq: ["$$book.approvalStatus", "Pending"]}
                                ]
                            }
                        }
                    }
                }
        },
            {
                $match: {
                    "books.approvalStatus": "Pending"
                }
            }
        ])
        if(!bookRequestForUser || bookRequestForUser[0].books.length == 0) {
            response.status(404).send("Book is not pending to approve")
            return
        }
        response.status(200).send(bookRequestForUser)
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET operation failed while retrieving pending request for the book")
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

        // Dummy change
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

// PUT Operator - To approve individual request
approveRouter.put('/requests/approveindividualrequest/:user_id/:book_id', async(request, response) => {

    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userDetail = await userModel.findOne({id: Number(user_id)})
        const book = await bookModel.findOne({id: Number(book_id)})

        const pendingBookRequestForUser = await requestModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$books", as: "book",
                            cond: {$and: [{$eq: ["$$book.book_id", Number(book_id)]}, {$eq: ["$$book.approvalStatus", 'Pending']}]}}
                    }
                }},{$match: {"books.approvalStatus": 'Pending'}}
        ])

        const approvedRequestsForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {$filter: {input: "$books", as: "book",
                            cond: {$and: [{$eq: ["$$book.checkOutDate", null]}, {$eq: ["$$book.approvalStatus", "Approved"]}]}}
                    }
                }}, {$match: {"books.approvalStatus": 'Approved'}}
        ])

        const userActivities = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}},{$project:
                {booksBorrowed: { $filter: {input: "$booksBorrowed",as: "borrowed",
                            cond: {$and: [{$gt: ["$$borrowed.returnDate", Date.now()]}, {$eq:["$$borrowed.actualReturnDate", null]}]}}
                    }}
        }])

        if( !pendingBookRequestForUser) {
            response.status(404).send("Requests don't exist for the user:"+userDetail.name)
            return
        }

        const booksCheckedOut = (userActivities.length == 0)? 0 : userActivities[0].booksBorrowed.length //numberOfBooksBorrowed
        const approvedBooks = (approvedRequestsForUser.length == 0)? 0 : approvedRequestsForUser[0].books.length

        if(userActivities !== null && booksCheckedOut + approvedBooks >= maxBooks) {
            response.status(400).send({"message":"Please decline the request as the user has already borrowed maximum books"})
            return
        }
        else if (booksCheckedOut < maxBooks && approvedBooks < maxBooks && booksCheckedOut + approvedBooks + 1 <= maxBooks) {
            const approvalDate = new Date(Date.now())
            const updatedBookRequest = await requestModel.updateOne({user_id: Number(user_id), "books.book_id": Number(book_id)},
                {$set:
                        {"books.$.approvalStatus": 'Approved',
                            "books.$.approvedOrRejectedDate": approvalDate,
                            "books.$.comments": "Book is ready for checkout"
                        }
                }
            )
            bookModel.findOne({id: Number(book_id)})
                .then(book => {
                    console.log(book.title); // logs the book's title
                    const notificationMsg = "Your request for '" + book.title +  "' is approved."
                    const notification = new Notification({
                        id: Math.floor(Math.random() * 1000000),
                        message: notificationMsg,
                        userId: user_id,
                        bookId: book_id,
                        read: false
                    });
                    return notification.save(); // return the save operation Promise
                })
                .then(() => {
                    response.status(200).send({"approvalDate": approvalDate, "approvalStatus": "Approved"})
                })
                .catch(err => {
                    console.error(err); // handle any errors
                    response.status(500).send({"message": "Some error occurred"})
                });

        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"PUT operation failed while approving user request for the book"})
    }
})

// PUT Operator - To decline individual request
approveRouter.put('/requests/declineindividualrequest/:user_id/:book_id', async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const userDetail = await userModel.findOne({id: Number(user_id)})

        const book = await bookModel.findOne({id: Number(book_id)})

        const pendingBookRequestForUser = await requestModel.aggregate([{$match: {"user_id": Number(user_id)}}, {$project:
                {books: {$filter: {input: "$books", as: "book",
                            cond: {$and: [{$eq: ["$$book.book_id", Number(book_id)]}, {$eq: ["$$book.approvalStatus", 'Pending']}]}}
                    }
                }},{$match: {"books.approvalStatus": 'Pending'}}
        ])

        const userActivities = await userActivitiesModel.aggregate([{$match: {"user_id": Number(user_id)}},{$project:
                {booksBorrowed: { $filter: {input: "$booksBorrowed",as: "borrowed",
                            cond: {$and: [{$gt: ["$$borrowed.returnDate", Date.now()]}, {$eq:["$$borrowed.actualReturnDate", null]}]}}
                    }}
        }])

        const approvedRequestsForUser = await requestModel.aggregate([{$match: { "user_id": Number(user_id) }},{$project:
                {books: {$filter: {input: "$books", as: "book",
                            cond: {$and: [{$eq: ["$$book.checkOutDate", null]}, {$eq: ["$$book.approvalStatus", "Approved"]}]}}
                    }
                }}, {$match: {"books.approvalStatus": 'Approved'}}
        ])

        if(!pendingBookRequestForUser) {
            response.status(404).send({"message":"Requests don't exist for the user:"+userDetail.name})
            return
        }

        const booksCheckedOut = (userActivities.length == 0)? 0 : userActivities[0].booksBorrowed.length
        const approvedBooks = (approvedRequestsForUser.length == 0)? 0 : approvedRequestsForUser[0].books.length

        const rejectDate = new Date(Date.now())

        if(userActivities !== null && approvedBooks + booksCheckedOut == maxBooks) {

            await requestModel.updateOne({user_id: Number(user_id), "books.book_id": Number(book_id)},
                {$set:
                        {"books.$.approvalStatus": 'Declined',
                            "books.$.approvedOrRejectedDate": rejectDate,
                            "books.$.comments": "You already have maximum books borrowed"
                        }
                }
            )

            await bookModel.updateOne({id: Number(book_id)}, {$inc: {count: +1}})
            response.status(200).send({"rejectDate":rejectDate})
            return
        }

        await requestModel.updateOne({user_id: Number(user_id), "books.book_id": Number(book_id)},
            {$set:
                    {"books.$.approvalStatus": 'Declined',
                        "books.$.approvedOrRejectedDate": Date.now(),
                        "books.$.comments": "Request Declined"
                    }
            }
        )

        await bookModel.updateOne({id: Number(book_id)}, {$inc: {count: +1}})
        response.status(200).send({"rejectDate":rejectDate, "approvalStatus":"Declined"})
        return
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"PUT operation failed while approving user request for the book"})
    }
})

module.exports = approveRouter