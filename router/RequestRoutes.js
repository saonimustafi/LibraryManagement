const express = require('express')
const requestRouter = new express.Router()
const requestModel = require('../models/request')
const bookModel = require('../models/books')
const userModel = require('../models/users')

// GET Operator
requestRouter.get('/requests/:user_id', async (request, response) => {
    const user_id = request.params.user_id
    
    try {
        const userDetail = await userModel.findOne({id: Number(user_id)})
        const requests = await requestModel.findOne({user_id: Number(user_id)})

        // response.status(200).send(requests)

        if(requests && requests.books.length != 0) {
            response.status(200).send(requests)
        }
        else {
            response.status(200).send({})
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("GET request failed to retrieve user requests")
    }
})

//POST Operator
requestRouter.post('/requests/newrequests/:user_id/:book_id', async (request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const requestBucket = await requestModel.findOne({user_id: Number(user_id)})
        const book = await bookModel.findOne({id: Number(book_id)})
        const userDetail = await userModel.findOne({id: Number(user_id)})

        if(!book) {
            response.status(404).send("Book not found")
            return
        }

        // If request bucket for the user exists
        if(requestBucket) {
            const bookIndex = requestBucket.books.findIndex(book => book.book_id == Number(book_id))

            // If the book already exists in the request bucket - do not add it again
            if(bookIndex > -1 && (requestBucket.books[bookIndex].book_id == Number(book_id) && (requestBucket.books[bookIndex].approvalStatus == "Pending" || requestBucket.books[bookIndex].approvalStatus == "Approved"))) {
                response.status(200).send(`Cannot add the book "${book.title}" to the request bucket as it already exists for the user: ${userDetail.name}`)
                return
            }

            const book_count = book.count

            // If the count of book > 0
            if(book_count > 0) {

                // Add this new request to the user's request bucket
                let newBookRequest = {
                    "book_id": book_id,
                    "title":book.title,
                    "author": book.author,
                    "image": book.image,
                    "requestDate": Date.now(),
                    "approvalStatus": "Pending",
                    "approvedOrRejectedDate": null,
                    "checkoutDate": null,
                    "comments": null
                }

                requestBucket.books.push(newBookRequest)
                await requestBucket.save();

                // Decrease the count of the book in the books DB
                await bookModel.updateOne({id : Number(book_id)}, {$inc : {count : -1}})

                response.status(201).send({"message":`Book added to Request Bucket for user: ${userDetail.name}`})
            }
            // If the count of book == 0
            else {
                response.status(200).send({"message":"Book not available in the library"})
                return
            }
        }

        // If the request bucket for the user does not exist
        else {
            // Create a new request bucket
            const newBookRequest =
                {
                    "book_id": book_id,
                    "title":book.title,
                    "author": book.author,
                    "image": book.image,
                    "requestDate": Date.now(),
                    "approvalStatus": "Pending",
                    "checkoutDate": null
                }

            const newRequest = {
                "user_id": user_id,
                "books": [newBookRequest]
            }
            const newRequestBucket = await requestModel.create(newRequest)
            // Decrease the count of the book
            await bookModel.updateOne({id : Number(book_id)}, {$inc : {count : -1}})
            response.status(201).send(newRequestBucket)
        }   
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"POST operation failed to add new requests for user"})
    }
})

// DELETE Operator - Delete a book from the request bucket
requestRouter.delete('/requests/deleterequests/:user_id/:book_id',async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id
    
    try {
        let requestBucket = await requestModel.findOne({user_id: user_id})
        const userDetail = await userModel.findOne({id: user_id})

        // If request bucket for user is not found
        if(!requestBucket) {
            response.status(404).send({"message":"Request bucket not found"})
            return
        }

        const bookList = requestBucket.books
        const bookIndex = bookList.findIndex(book => book.book_id === Number(book_id))

        // If the book to be deleted exists, delete the book and increase the count of the book in inventory
        if(bookIndex> -1) {
            await requestModel.updateOne({user_id : user_id}, {$pull : {books : {book_id : book_id}}})
            await bookModel.updateOne({id: book_id},{$inc : {count : +1}})

            const requestBucketAfterDeletion = await requestModel.findOne({user_id : user_id})

            // If after book deletion from request bucket, there are no more books, delete the request bucket for the user entirely
            if(requestBucketAfterDeletion.books.length === 0) {
                await requestModel.deleteOne({user_id : user_id})
                response.status(200).send({"message":"Book deleted from request & request bucket for the user has been removed"})
                return
            }

            // If there are book left in the request bucket, send the message to the user
            else {
                response.status(200).send({"message":"Deleted requested book from request bucket"})
                return
            }
        }

        // If bookIndex == -1, book does not exist in the request bucket for the user
        else {
            response.status(404).send({"message":"Book not found in request bucket"})
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send({"message":"DELETE operation failed to delete request for user"})
    }
})

// DELETE entire request bucket
requestRouter.delete('/requests/deleterequests/:user_id', async(request, response) => {
    const user_id = request.params.user_id

    try {
        const userDetail = await userModel.findOne({id : user_id})
        let requestBucket = await requestModel.findOne({user_id : user_id})

        // If the books exist in the request bucket for the user, delete the books and increment the book count in the inventory
        if(requestBucket && requestBucket.books.length > 0) {
            const bookList = requestBucket.books

            for(let bookIndex = 0; bookIndex < bookList.length; bookIndex++) {
                let book_id = bookList[bookIndex].book_id

                requestBucket = await requestModel.updateOne({user_id : user_id}, {$pull : {books : {book_id : book_id}}})
                await bookModel.updateOne({id : book_id}, {$inc : {count : +1}})
            }
            await requestModel.deleteOne({user_id : user_id})
            response.status(200).send({"message":`Request bucket deleted for user: ${userDetail.name}`})
        }
        // If the request bucket does not exist for the user
        else {
            response.status(404).send({"message":`Request Bucket does not exist for the user:${userDetail.name}`})
        }
    }
    catch(error) {
        response.status(500).send({"message":"DELETE operation failed to delete the entire request bucket for the user."})
    }
})

module.exports = requestRouter