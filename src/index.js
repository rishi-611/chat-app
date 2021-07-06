const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage } = require("./utils/message");
const {
  createUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const port = process.env.PORT;

const app = express();

// we wrapped the app with server so that we can use socket io and customize the server,
// this does not change any behaviour because this is done anyways behind the scene by express
const server = http.createServer(app);
// this is how we configure socketio. io needs a raw http server to be wrapped around socket.io fnctn,
// this gives us access to client side socket too, by adding a script.
const io = socketio(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.html");
});

// connection is an inbuilt event, triggers on a new connection
// connection has a handle that receives socket arg,
// socket is an object which contains info about this new connection
io.on("connection", (socket) => {
  // socke.emit emits the event to this particular connection
  // message is a custom event. custom events must also my emitted manually
  console.log("new client connected");

  socket.on("join", ({ username, room }, callback) => {
    // createUser returns either a user on success to error on failure
    const { error, user } = createUser(socket.id, username, room);
    if (error) {
      return callback(error);
    }
    socket.join(user.room);
    callback();

    // when a user connects, fetch all users in room and push current user
    // then pass the room and room's users to all members of room
    const userList = getUsersInRoom(user.room);
    io.in(user.room).emit("room-data", { userList, room: user.room });

    socket.emit(
      "admin-message",
      generateMessage("Admin", `Welcome ${user.username}`)
    );
    socket.broadcast
      .to(user.room)
      .emit(
        "admin-message",
        generateMessage("Admin", `${user.username} joined the chat`)
      );
  });

  socket.on("sendError", (error) => {
    socket.emit("admin-message", generateMessage("Admin", error));
  });

  socket.on("sendMessage", (msg, acknowledge) => {
    // io.emit emits message to all connections
    const { user } = getUser(socket.id);
    if (!user) {
      socket.emit(
        "admin-message",
        generateMessage("Failed to send the message")
      );
      return acknowledge();
    }
    const filter = new Filter();
    msg = filter.clean(msg);

    socket.emit("own-message", generateMessage("You", msg));

    socket.to(user.room).emit("message", generateMessage(user.username, msg));
    acknowledge();
  });

  socket.on("sendLocation", (coords, acknowledge) => {
    const { user } = getUser(socket.id);
    if (!user) {
      socket.emit("admin-message", generateMessage("some error occured"));
      return;
    }
    // io.in emits to everyone in the room, including the current user
    socket.emit(
      "own-location",
      generateMessage(
        user.username,
        `https://google.com/maps?q=${coords.lat},${coords.lng}`
      )
    );

    socket
      .to(user.room)
      .emit(
        "location",
        generateMessage(
          user.username,
          `https://google.com/maps?q=${coords.lat},${coords.lng}`
        )
      );
    // this function is defined in client js, so when it is called, console log takes place in browser
    acknowledge();
  });

  // disconnect is inbuilt event, gets triggered when user disconnects
  socket.on("disconnect", () => {
    const { user } = getUser(socket.id);

    if (!user) {
      // if user disconnects while on the homepage, he wont be in any room
      return;
    }

    socket
      .to(user.room)
      .emit(
        "admin-message",
        generateMessage("Admin", `${user.username} left the chat`)
      );
    removeUser(socket.id);

    // update room data for all room members
    const userList = getUsersInRoom(user.room);
    socket.to(user.room).emit("room-data", { userList, room: user.room });
  });
});

server.listen(port, () => console.log(`listening to port ${port}`));
