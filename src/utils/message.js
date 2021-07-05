const generateMessage = (username, message) => ({
  username,
  message,
  createdAt: new Date().toString(),
});

module.exports = {
  generateMessage,
};
