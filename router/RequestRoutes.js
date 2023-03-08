const express = require('express')
const requestRouter = new express.Router()
const requestModel = require('../models/request')
const bookModel = require('../models/books')
const userModel = require('../models/users')

// GET Operator
requestRouter.get('/requests/:user_id', async (request, response) => {
    const user = request.params.user_id
    
    try {
        const userDetail = await userModel.findOne({id: user})
        const requests = await requestModel.findOne({user_id: user})
        if(requests && requests.books.length != 0) {
            response.status(200).send(requests)
        }
        else {
            response.status(404).send("No requests exist for the user: "+userDetail.name)
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send(error)
    }
})

//POST Operator
requestRouter.post('/requests/newrequests/:user_id/:book_id', async (request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id

    try {
        const requestBucket = await requestModel.findOne({user_id: user_id})
        const book = await bookModel.findOne({id: book_id})

        if(!book) {
            response.status(404).send("Book not found")
            return
        }
        
        // If request bucket for the user exists
        if(requestBucket) {
            const book_count = book.count
            
            // If the count of book > 0
            if(book_count > 0) {

                // Add this new request to the user's request bucket 
                // let newBookRequest = [book_id, book.name, book.author, Date.now, "Pending", null]
                let newBookRequest = {
                    "book_id": book_id,
                    "name":book.name,
                    "author": book.author,
                    "requestDate": Date.now(),
                    "approvalStatus": "Pending",
                    "checkoutDate": null
                }

                requestBucket.books.push(newBookRequest)
                await requestBucket.save();

                // Decrease the count of the book in the books DB
                await bookModel.updateOne({id : book_id}, {$inc : {count : -1}})

                response.status(201).send("Book added to Request Bucket")
            }
            // If the count of book < 0
            else {
                response.status(200).send("Book not available in the library")
                return
            }
        }

        // If the request bucket for the user does not exist
        else {
            // Create a request bucket
            const newBookRequest = new requestModel(request.body)
            const newRequestBucket = await requestModel.create(newBookRequest)
                // user_id,
                // books : [book_id, book.name, book.author, Date.now, "Pending", null]
            // )
            response.status(201).send(newRequestBucket)
        }   
    }
    catch(error) {
        console.error(error)
        response.status(500).send("Server error occurred")
    }
})

// DELETE Operator - Delete a book from the request bucket
requestRouter.delete('/requests/deleterequests/:user_id/:book_id',async(request, response) => {
    const user_id = request.params.user_id
    const book_id = request.params.book_id
    
    try {
        const requestBucket = await requestModel.findOne({user_id: user_id})
        
        if(!requestBucket) {
            response.status(404).send("Request bucket not found")
            return
        }

        const bookList = requestBucket.books
        const bookIndex = bookList.findIndex(book => book.book_id === Number(book_id))

        if(bookIndex> -1) {  
            const requestBucket = await requestModel.updateOne({user_id : user_id}, {$pull : {books : {book_id : book_id}}})
            await bookModel.updateOne({id: book_id},{$inc : {count : +1}})
            response.status(200).send("Deleted requested book from request bucket")
        }
        else {
            response.status(404).send("Book not found in request bucket")
        }
    }
    catch(error) {
        console.error(error)
        response.status(500).send("Server error occurred")
    }
})

module.exports = requestRouter