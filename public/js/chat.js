"use strict";
const socket = io();

// elements
const msgForm = document.querySelector("#message-form");
const msgInput = document.querySelector("#messageInput");
const msgBtn = document.querySelector("#msg-btn");
const locationBtn = document.querySelector("#location-btn");
const msgcontainer = document.querySelector("#messages-container");
const message = document.querySelector("#message").innerHTML;
const ownMessage = document.querySelector("#own-message").innerHTML;
const adminMessage = document.querySelector("#admin-message").innerHTML;
const locationMsg = document.querySelector("#location").innerHTML;
const ownLocationMsg = document.querySelector("#own-location").innerHTML;
const roomDataTemplate = document.querySelector(
  "#room-data-template"
).innerHTML;
const sidebar = document.querySelector("#sidebar");

// join room
// Qs comes from query string library cdn, to parse query string added to the url by form action
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// autoscroll (will only scroll to bottom if when new msg is sent, the user is already at bottom)
const autoscroll = () => {
  // NEW MESSAGE HEIGHT
  const newMessage = msgcontainer.lastElementChild;
  const newMessageStyle = getComputedStyle(newMessage);
  // offset height includes height+padding+border
  // we are adding margins to get total height
  const newMessageHeight =
    newMessage.offsetHeight + parseInt(newMessageStyle.marginBottom);

  // VISIBLE HEIGHT OF MESSAGE CONTAINER
  const visibleHeight = msgcontainer.offsetHeight;

  // HEIGHT OF messages containere, including overflow
  const containerHeight = msgcontainer.scrollHeight;

  const scrollHeight = msgcontainer.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollHeight) {
    // scroll so that that total scrollable height is covered
    msgcontainer.scrollTop = msgcontainer.scrollHeight;
  }
};

// by default every user is in a room which is his id,
// custom rooms can be created which multiple users can join
// msgs sent to the room are only accessable by those who have joined the room
// rooms can only be joined on server, so we emit a custom join event to server, so it knows we want to join
// we want to join a room as soon as the user is directed to chat page
socket.emit("join", { username, room }, (error) => {
  if (error) {
    location.href = "/";
    return alert(error);
  }
});
// socket

socket.on("room-data", ({ userList, room }) => {
  const userIndex = userList.findIndex((user) => user.id === socket.id);
  if (userIndex !== -1) {
    userList[userIndex].username = userList[userIndex].username + " (you)";
  }
  const roomDataHTML = Mustache.render(roomDataTemplate, {
    userList,
    room,
  });
  sidebar.innerHTML = roomDataHTML;
});

socket.on("message", ({ username, message: msg, createdAt }) => {
  const messageHTML = Mustache.render(message, {
    username,
    msg,
    createdAt: dayjs(createdAt).format("hh:ss:mm A"),
  });
  msgcontainer.insertAdjacentHTML("beforeend", messageHTML);
  autoscroll();
});

socket.on("own-message", ({ username, message: msg, createdAt }) => {
  const messageHTML = Mustache.render(ownMessage, {
    username,
    msg,
    createdAt: dayjs(createdAt).format("hh:ss:mm A"),
  });
  msgcontainer.insertAdjacentHTML("beforeend", messageHTML);
  autoscroll();
});

socket.on("admin-message", ({ username, message: msg, createdAt }) => {
  const messageHTML = Mustache.render(adminMessage, {
    username,
    msg,
    createdAt: dayjs(createdAt).format("hh:ss:mm A"),
  });
  msgcontainer.insertAdjacentHTML("beforeend", messageHTML);
  autoscroll();
});

socket.on("location", ({ username, message: locationLink, createdAt }) => {
  const locationHTML = Mustache.render(locationMsg, {
    username,
    locationLink,
    createdAt: dayjs(createdAt).format("hh:ss:mm A"),
  });
  msgcontainer.insertAdjacentHTML("beforeend", locationHTML);
  autoscroll();
});

socket.on("own-location", ({ message: locationLink, createdAt }) => {
  const locationHTML = Mustache.render(ownLocationMsg, {
    username,
    locationLink,
    createdAt: dayjs(createdAt).format("hh:ss:mm A"),
  });
  msgcontainer.insertAdjacentHTML("beforeend", locationHTML);
  autoscroll();
});

const handleMsgFormSubmit = (e) => {
  e.preventDefault();

  msgBtn.disabled = true;
  socket.emit("sendMessage", e.target.elements.message.value, (err) => {
    if (err) socket.emit("sendError", err.error);

    msgBtn.disabled = false;
    msgInput.value = "";
    msgInput.focus();
  });
};

const handleLocationBtn = () => {
  if (!navigator.geolocation) {
    return socket.emit(
      "sendError",
      "Your browser does not support this feature"
    );
  }
  locationBtn.disabled = true;

  const success = (position) => {
    const { latitude, longitude } = position.coords;
    // providing a callback fnc which can be called when the event handling is done. this is called event acknowledegment
    socket.emit("sendLocation", { lat: latitude, lng: longitude }, (err) => {
      locationBtn.disabled = false;
      if (err) return socket.emit("sendError", "Failed to send your location");
    });
  };

  const error = (err) => {
    socket.emit(
      "sendError",
      "You must allow access to your location to use this feature"
    );
    locationBtn.disabled = false;
  };

  navigator.geolocation.getCurrentPosition(success, error);
};

msgForm.addEventListener("submit", handleMsgFormSubmit);

locationBtn.addEventListener("click", handleLocationBtn);
