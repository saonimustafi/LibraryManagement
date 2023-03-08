const express = require('express')
const bookRouter = new express.Router()
const bookModel = require('../models/books')

//GET Operator
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
        response.status(500).send('POST operation failed while updating book')
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