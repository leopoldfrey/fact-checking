//Set up the canvas variables for drawing and interaction
let outcan = document.getElementById("outcanvas");
let outc = outcan.getContext("2d");
let WW = 640;//outcan.width;
let HH = 640;//outcan.height;

let fcan = document.getElementById("friendcanvas");
let fc = fcan.getContext("2d");

let PEN = 0;
let BRUSH = 1;
let ERASER = 2;

//this sets the drawing loop.
let time = window.setInterval(animate, 10);
let nameFlash = 0;

//prototype object for representing current state
let friend = {
	tool: PEN,
	pX: -1, pY: -1,
	x: 0, y: 0, 
	name: "FriendName", 
	active: false, 
	pencolor: 000000, 
	penwidth: 0
};

//the array of connected clients
let friends = {};

function selPen()
{
	friend.tool = PEN;
	updateTool();
}

function selBrush()
{
	friend.tool = BRUSH;
	updateTool();
}

function selGom()
{
	friend.tool = ERASER;
	updateTool();
}

function updateTool()
{
	tP = document.getElementById("tPen");
	tB = document.getElementById("tBrush");
	tG = document.getElementById("tGom");
	pw = document.getElementById("penwidth");
	
	switch(friend.tool) {
		case PEN:
			tP.src = "img/pen2.png";
			tB.src = "img/brush1.png";
			tG.src = "img/gom1.png";
			friend.penwidth = 1;
			pw.value = 1;
			break;
		case BRUSH:
			tP.src = "img/pen1.png";
			tB.src = "img/brush2.png";
			tG.src = "img/gom1.png";
			friend.penwidth = 20;
			pw.value = 20;
			break;
		case ERASER:
			tP.src = "img/pen1.png";
			tB.src = "img/brush1.png";
			tG.src = "img/gom2.png";
			friend.penwidth = 30;
			pw.value = 30;
			break;
	}	
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// drawing loop
function animate() {
	Object.keys(friends).forEach(function (name) {
		if (friends[name].active) {
			if(friends[name].tool == ERASER)
			{
				fc.clearRect((friends[name].x * WW - friends[name].penwidth/2.), (friends[name].y * HH - friends[name].penwidth/2.), friends[name].penwidth, friends[name].penwidth);
			} else {
				if(friends[name].pX == -1) {
					friends[name].pX = friends[name].x;
					friends[name].pY = friends[name].y;
				}
				if(friends[name].tool == BRUSH) {
					rvb = hexToRgb("#"+friends[name].pencolor);
					fc.strokeStyle = 'rgba('+rvb.r+','+rvb.g+','+rvb.b+',0.02)';
				} else {
					fc.strokeStyle = "#"+friends[name].pencolor;
				}
				fc.lineCap = "round";
				fc.lineJoin = "round";
				fc.lineWidth = friends[name].penwidth;
				fc.beginPath();
				fc.moveTo(friends[name].pX * WW, friends[name].pY * HH);
				fc.lineTo(friends[name].pX * WW, friends[name].pY * HH);
				fc.lineTo(friends[name].x * WW, friends[name].y * HH);
				fc.stroke();
			}
		}
	});

	nameFlash++;
	if (nameFlash > 3) {
		$("#incoming_scrop").html("…");
	}
}

function clearLocal() {
	outc.clearRect(0, 0, WW, HH);
	socket.emit("clear-local", friend.name);
};	

function clearFriends() {
	fc.clearRect(0, 0, WW, HH);
};	

// ------------socket stuff

/* Socket messages come in the form of an identifier followed by whatever data 
	is being sent. When setting up new messages, you need to make sure there are
	handlers in place on both the client and server side.
	*/
let socket = io();

// send current drawing state
function sendIt() {
	if (friend.name != "FriendName") {
	    socket.emit("friend-data", friend);
	}
}

socket.on("clear-friends", function (msg) {
	if(msg.name != friend.name)
		clearFriends();
});

//handler for receiving "friend-data" messages from socket
socket.on("friend-data", function (msg) {
	updateFriend(msg.name, msg);
	$("#incoming_scrop").html(msg.name + " is writing...");
	nameFlash = 0;
});

//handler for the initial socket connection
socket.on("connect", function () {
	console.log("connection: " + socket.connected);
});

//handler for receiving "name-assignment" messages from socket
socket.on("name-assignment", function (msg) {
	friend.name = msg;
	$("#my_name").html(msg);
});

//handler for receiving "online-users messages from socket"
socket.on("online-users", function (count) {
	// $('#active_users').html("");
	$("#active_users").html(count.toString());
});

//handler for receiving "friend-list" messages from socket
socket.on("friend-list", (msg)=>{
	friendFilter(msg);
});

socket.on("background", function (img) {
	//console.log(img);
	document.getElementById("bg").src = img;
});

socket.on("clear", function () {
	clearLocal();
	clearFriends();
});

// ----friend management
function sendFriend() {
	socket.emit("friend-data", friend);
}

function friendFilter(masterList) {
	Object.keys(friends).forEach(function (name) {
		if (masterList.indexOf(name) === -1) {
			delete friends[name];
		}
	});
}

function updateFriend(name, msg) {
	friends[name] = msg;
};

// ----------bind the touch/click events
$(document).ready(function () {
	$("#outcanvas").on("mousedown", function (e) {
		e.originalEvent.preventDefault();
		
		friend.active = true;
		friend.pX = -1;
		
		sendEvt(e);
		
		$(document).on("mousemove", function (e) {
			
			friend.pX = friend.x;
			friend.pY = friend.y;
			
			sendEvt(e);
		});
		$(document).on("mouseup", function (e) {
			$(document).unbind("mousemove");
			$(document).unbind("mouseup");
			
			friend.active = false;
			friend.pX = -1;
			
			sendIt();
		});
	});

	$("#outcanvas").on("touchstart", function (e) {
		e.preventDefault();
		e.originalEvent.preventDefault();
		let ev = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		
		friend.active = true;
		friend.pX = -1;
		
		sendEvt(ev);
		
		$(document).on("touchmove", function (e) {
			e.preventDefault();
			e.originalEvent.preventDefault();
			let ev = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			
			friend.pX = friend.x;
			friend.pY = friend.y;
			
			sendEvt(e);
		});
		$(document).on("touchend", function (e) {
			$(document).unbind("touchmove");
			$(document).unbind("touchend");
			
			friend.active = false;
			friend.pX = -1;
			
			sendIt();
		});
	});
});

function sendEvt(ev)
{
	friend.x = ev.pageX / WW;
	friend.y = ev.pageY / HH;
	friend.pencolor = document.getElementById("pencolor").value;
	friend.penwidth = document.getElementById("penwidth").value;

	if(friend.tool == ERASER)
	{
		outc.clearRect((friend.x * WW - friend.penwidth/2.), (friend.y * HH - friend.penwidth/2.), friend.penwidth, friend.penwidth);
	} else {
		if(friend.pX == -1) {
			friend.pX = friend.x;
			friend.pY = friend.y;
		}
		outc.lineCap = "round";
		outc.lineJoin = "round";
		outc.lineWidth = friend.penwidth;
		if(friend.tool == BRUSH) {
			rvb = hexToRgb("#"+friend.pencolor);
			outc.strokeStyle = 'rgba('+rvb.r+','+rvb.g+','+rvb.b+',0.02)';
		} else {
			outc.strokeStyle = "#"+friend.pencolor;
		}
		outc.beginPath();
		outc.moveTo(friend.pX * WW, friend.pY * HH);
		outc.lineTo(friend.pX * WW, friend.pY * HH);
		outc.lineTo(friend.x * WW, friend.y * HH);
		outc.stroke();
	}
	sendIt();
}
