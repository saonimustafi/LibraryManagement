const socketIO = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIO(server);
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
