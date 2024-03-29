// Export the libraries
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const socketIO = require('./utils/socket');

const bookRouter = require('./router/bookRoutes')
const userRouter = require('./router/userRoutes')
const UserAuthRouter = require('./router/UserAuthRoutes')
const requestRouter = require('./router/RequestRoutes')
const UserActivitiesRouter = require('./router/UserActivitiesRoutes')
const approveRouter = require('./router/ApprovalStatusRoutes')
const returnBooksRouter = require('./router/returnBooksRoutes')
const renewBookRouter = require('./router/renewBookRoutes')
const SearchRouter = require('./router/SearchRoutes')
const FineRouter = require('./router/FineRouter')
const NotificationRouter = require('./router/NotificationRoutes')


const app = express()
const port = 3000

// Create connection to mongoose
// console.log("Mongoose status = "+mongoose.connection.readyState);
mongoose.connect('mongodb://127.0.0.1:27017/booksdb');
// console.log("Mongoose status1 = "+mongoose.connection.readyState);

// Check if MongoDB connection was successful
const db = mongoose.connection
db.on('error', console.error.bind(console, "connection error: "))

db.once('open', () => {
    console.log("Connected to DB")
})

app.use(cors())
app.use(express.json())

app.use('/', SearchRouter)
app.use('/', bookRouter)
app.use('/', userRouter)
app.use('/', requestRouter)
app.use('/', approveRouter)
app.use('/', returnBooksRouter)
app.use('/', renewBookRouter)
app.use('/', UserAuthRouter)
app.use('/', UserActivitiesRouter)
app.use('/', FineRouter)
app.use('/', NotificationRouter)


// Start server on port
const server = app.listen(port, () => {
    console.log(`Server running on port: ${port}`)
});

// Socket.io code
socketIO.init(server);

// Notification.watch().on('change', (change) => {
//   if (change.operationType === 'insert') {
//     const newNotification = change.fullDocument;
//     io.emit('newNotification', newNotification);
//   }
// });