const mongoose = require('mongoose')
const RequestSchema = new mongoose.Schema({ //Also has borrow details
    user_id: {
        type: Number,
        required: true
    },
    books: [{
        book_id: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        author: {
            type: String,
            required: true
        },
        requestDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        approvalStatus: {
            type: String,
            enum: ['Approved', 'Pending', 'Declined'],
            default: 'Pending'
        },
        checkoutDate: {
            type: Date,
            default: null
        } 
    }]    
})

const Request = mongoose.model('bookRaiseRequest', RequestSchema)
 module.exports = Request