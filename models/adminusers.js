const mongoose = require('mongoose')

const AdminUserSchema = new mongoose.Schema({
    id :{
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Please enter name']
    },
    email: {
        type: String,
        required: true,
        unique: [true, 'Please enter email']
    },
    password: {
        type: String,
        required: [true, 'Please enter password']
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'admin'
    }
})

const AdminUser = mongoose.model('AdminUser', AdminUserSchema)
module.exports = AdminUser