const express = require('express')
const bookRouter = new express.Router()
const bookModel = require('../models/books')

//GET Operator - GET all books
bookRouter.get('/books', async (request, response) => {
    try {
        console.log('Fetching books...')
        const books = await bookModel.find({})
        response.status(200).send(books)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('GET operation failed while fetching books')
    }
})

// GET Operator - GET book by book id
bookRouter.get('/books/:id', async(request, response) => {
    const book_id = request.params.id
    try {
        const book = await bookModel.findOne({id : book_id})

        // If book does not exist
        if(!book) {
            response.status(404).send("Book does not exist")
            return
        }
        else {
            response.status(200).send(book)
        }
    }
    catch(error) {
        console.error(error)
        response.send(500).status("GET operation failed while fetching book: "+book_id)
    }
})

// POST Operator
bookRouter.post('/books/newbook', async (request, response) => {
    try {
        const newBook = new bookModel(request.body)
        const book = await bookModel.create(newBook)
        response.status(201).send(book)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('POST operation failed while creating new book')
    }
})

//PUT Operator
bookRouter.put('/books/updatebook/:id', async (request, response) => {
    try {
        console.log('Updating Book...')
        const updateBook = await bookModel.findOneAndUpdate({id: request.params.id}, request.body, {new: true})
        response.status(200).send(updateBook) 
    }
    catch(error) {
        console.error(error)
        response.status(500).send('PUT operation failed while updating book')
    }
})

// DELETE Operator
bookRouter.delete('/books/deletebook/:id', async (request, response, next) => {
    try {
        const deleteBook = await bookModel.findOneAndDelete({id: request.params.id})
        response.status(204).send(deleteBook)
    }
    catch(error) {
        console.error(error)
        response.status(500).send('DELETE operation failed while deleting book')
    }
})

module.exports = bookRouter