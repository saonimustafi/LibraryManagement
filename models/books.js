const mongoose = require('mongoose')
const BookSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    image: {
        type: String,
        default: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwestsiderc.org%2Fboard-of-directors-2%2Fimage-not-available%2F&psig=AOvVaw1oHiDFJYh8GeCS26bwsO_o&ust=1681168879157000&source=images&cd=vfe&ved=0CA0QjRxqFwoTCMjUuaL4nf4CFQAAAAAdAAAAABAD"        
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