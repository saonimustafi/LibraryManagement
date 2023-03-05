const mongoose = require('mongoose')
const RaiseRequestSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
    },
    books: [{
        book_id: {
            type: Number,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        requestRaised: {
            type: Boolean,
            required: true
        },
        request_date: {
            type: Date,
            required: true,
        },
        approved: {
            type: String,
            enum: ['Approved', 'Pending', 'Declined'],
            default: 'Pending'
        }
    }]
})

const RaiseRequest = mongoose.model('bookRaiseRequest', RaiseRequestSchema)
 module.exports = RaiseRequest