const users = [];

class User {
  constructor(id, username, room) {
    this.username = username;
    this.id = id;
    this.room = room;
  }
}

const createUser = (id, username, room) => {
  // clean data
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();

  // validate
  //   check for empty strings
  if (!username || !room)
    return { error: "you must provide a username and room" };

  // check if username already exists in this room
  const userAlreadyExists = users.some(
    (user) => user.username === username && user.room === room
  );
  if (userAlreadyExists) return { error: "username already exists." };

  const user = new User(id, username, room);
  users.push(user);
  return { user };
};

const removeUser = (id) => {
  // every connection is unique, so all users should have unique id
  const userIndex = users.findIndex((user) => user.id === id);
  if (userIndex === -1) return { error: "user not found" };

  return users.splice(userIndex, 1)[0];
};

const getUser = (id) => {
  const user = users.find((user) => user.id === id);
  return { user };
};

const getUsersInRoom = (room) => {
  const usersInroom = users.filter((user) => user.room === room);
  return usersInroom;
};

module.exports = {
  createUser,
  removeUser,
  getUsersInRoom,
  getUser,
};