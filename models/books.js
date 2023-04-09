const mongoose = require('mongoose')
const BookSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: [true, 'Please enter the name of the book']
    },
    author: {
        type: String,
        required: [true, `Please enter author's name`]
    },
    category: {
        type: String,
        default: "Miscellaneous"
    },
    count: {
        type: Number,
        required: true
    }
})

const Book = mongoose.model('Book', BookSchema)
module.exports = Book