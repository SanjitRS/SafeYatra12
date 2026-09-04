const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_tourist_safety_jwt_key_2026_x98f');
        socket.user = decoded;
      } catch (err) {
        // Allow unauthenticated connection but mark as guest
        socket.user = null;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const userRole = socket.user?.role || 'guest';
    const userId = socket.user?.id || socket.id;
    const userZone = socket.user?.zone || socket.user?.jurisdiction || socket.handshake.query?.zone;

    console.log(`[Socket.IO] Client connected: ${socket.id} (Role: ${userRole}, User: ${userId}, Zone: ${userZone || 'N/A'})`);

    // Role-based room assignment
    if (['authority', 'dispatcher', 'admin'].includes(userRole)) {
      socket.join('authorities_room');
      console.log(`[Socket.IO] Authority/Dispatcher ${userId} joined authorities_room`);

      if (userZone) {
        const normalizedZone = `zone_${userZone.toString().toLowerCase().replace(/\s+/g, '_')}`;
        socket.join(normalizedZone);
        socket.join(`zone_${userZone}`);
        console.log(`[Socket.IO] Authority joined zone room: ${normalizedZone}`);
      }
    } else if (socket.user?.id) {
      socket.join(`tourist_${socket.user.id}`);
      console.log(`[Socket.IO] Tourist joined room: tourist_${socket.user.id}`);
    }

    // Manual zone join event
    socket.on('join_zone', (zone) => {
      if (zone) {
        const normalized = `zone_${zone.toString().toLowerCase().replace(/\s+/g, '_')}`;
        socket.join(normalized);
        socket.join(`zone_${zone}`);
        console.log(`[Socket.IO] ${socket.id} manually joined zone room: ${normalized}`);
      }
    });

    // Manual room join event
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized!');
  }
  return io;
};

/**
 * Broadcast an emergency or incident update to all connected authorities
 */
const broadcastToAuthorities = (event, data) => {
  if (io) {
    io.to('authorities_room').emit(event, data);
    // Also emit globally for any general dashboard listeners
    io.emit(event, data);
  }
};

/**
 * Broadcast an alert specifically to an authority zone room, plus global authorities
 */
const broadcastToZone = (zone, event, data) => {
  if (io) {
    if (zone) {
      const normalized = `zone_${zone.toString().toLowerCase().replace(/\s+/g, '_')}`;
      io.to(normalized).to(`zone_${zone}`).emit(event, data);
    }
    // Also send to authorities_room and emit globally
    io.to('authorities_room').emit(event, data);
    io.emit(event, data);
  }
};

/**
 * Send a targeted safety warning to a specific tourist
 */
const sendToTourist = (touristId, event, data) => {
  if (io) {
    io.to(`tourist_${touristId}`).emit(event, data);
  }
};

/**
 * Broadcast an alert to all connected sockets
 */
const broadcastAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  broadcastToAuthorities,
  broadcastToZone,
  sendToTourist,
  broadcastAll
};
