/** Lazy reference to Socket.IO server instance (set from app.js after creation). */
let io = null;

function setIO(ioInstance) {
  io = ioInstance;
}

function getIO() {
  return io;
}

module.exports = { setIO, getIO };
