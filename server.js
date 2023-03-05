// Export the libraries
const express = require('express')
const mongoose = require('mongoose')
const bookRouter = require('./router/bookRoutes')
const userRouter = require('./router/userRoutes')

const app = express()
const port = 3000

// Create connection to mongoose
mongoose.connect('mongodb://localhost:27017/booksdb');

// Check if MongoDB connection was successful
const db = mongoose.connection
db.on('error', console.error.bind(console, "connection error: "))

db.once('open', () => {
    console.log("Connected to DB")
})

app.use(express.json())
app.use('/',bookRouter)
app.use('/',userRouter)

// Start server on port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`)
})
