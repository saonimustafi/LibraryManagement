const express = require('express')
const SearchRouter = new express.Router()
const bookModel = require('../models/books')

//GET Operator - GET all books
SearchRouter.get('/search', async (request, response) => {
    const search_query = request.query.search_query
    if(search_query.length > 0) {
        try {        
            const books = await bookModel.find({ title: { $regex: new RegExp(search_query, 'i') } })
    
            // If book does not exist
            if(!books || books.length === 0) {
                response.status(404).send("Book does not exist")
                return
            }
            else {
                response.status(200).send(books)
            }
        }
        catch(error) {
            console.error(error)
            response.send(500).status("GET operation failed while fetching book: "+book_id)
        }
    } else {
        try {        
            const books = await bookModel.aggregate([{ $sample: { size: 20 } }]);
    
            // If book does not exist
            if(!books || books.length === 0) {
                response.status(500).send("Problem loading initial book list")
                return
            }
            else {
                response.status(200).send(books)
            }
        }
        catch(error) {
            console.error(error)
            response.send(500).status("GET operation failed while fetching book: "+book_id)
        }
    }
    
})

module.exports = SearchRouter