const mongoose = require('mongoose')
const BookSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    image: {
        type: String,
        default: "https://www.google.com/imgres?imgurl=https%3A%2F%2Fshenandoahcountyva.us%2Fbos%2Fwp-content%2Fuploads%2Fsites%2F4%2F2018%2F01%2Fpicture-not-available-clipart-12.jpg&tbnid=D0yF6SOHmaoxiM&vet=12ahUKEwjAkJrN-p3-AhU3OUQIHbX_D44QMygFegUIARDSAQ..i&imgrefurl=https%3A%2F%2Fshenandoahcountyva.us%2Fbos%2Fboard-of-supervisors%2Fpicture-not-available-clipart-12%2F&docid=vnWXAngWnPLMkM&w=512&h=512&q=image%20not%20available&ved=2ahUKEwjAkJrN-p3-AhU3OUQIHbX_D44QMygFegUIARDSAQ"
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