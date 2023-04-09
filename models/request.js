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
        title: {
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
        approvedOrRejectedDate: {
            type: Date,
            default: null
        },
        checkOutDate: {
            type: Date,
            default: null
        },
        comments : {
            type: String,
            default: null
        }
    }]    
})

const Request = mongoose.model('bookRaiseRequest', RequestSchema)
 module.exports = Request