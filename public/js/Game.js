/**  Primary constructor   */
function Game(canvas) {
	// This will hold the web socket connection
	this.connection = null;
	this._canvas = canvas;
	this._ctx = this._canvas.getContext("2d");
    this._ctx.font = "10pt Helvetica";


	// Image Files Stored in /img - I want to get this going as soon as possible
	this.images = {
		"background": "img/FeltTable.png",
		"cards" : "img/myCardsBack.png",
		"sitDown" : "img/Join.png",
		"check" : "img/CheckButton.png",
		"dealer" : "img/Dealer.png"
	};
	this.imageManager = new ImageManager();
	this.imageManager.load(this.images, this.onLoaded.bind(this));
	
	// Input Handlers for the touch events
	this.inputHandler = new InputHandler(this._canvas);
	this.inputHandler.on("move", this.onMove.bind(this));
	this.inputHandler.on("up", this.onUp.bind(this));
	
	// Establish a connect with the nodejs server - app.js
	this.runConnection();
}

_p = Game.prototype;



/** Once all images are loaded, start the animation and logic loop */
_p.onLoaded = function() {
	this._currentTable = new TableOne(this._canvas.width, this._canvas.height, this.imageManager, this.connection);
	// makes sure that "this" always refers to the instance of the game
	this._boundAnimate = this.animate.bind(this);
	// Begin the logic render loop (LRL from this point forward)
	this._boundAnimate(0);
	// Setup is complete, begin the game logic
	this.beginGameLogic();
};














/**
 				MAIN GAME FUNCTIONALITY BEGINS HERE
 */

/** At this point, everything is finished loading, a connection is made, ready to go **/
_p.beginGameLogic = function() {
	this._currentTable.run();
};








/**
 				EVENT LISTENERS / HANDLERS
 */

/**  CLICK Listener - e.x and e.y are where your mouse clicked ON THE SCREEN, ignorant of the world */
_p.onUp = function(e) {	
	//var jsonMsg = JSON.stringify( {kind:'userClicked', data:JSON.stringify( {y: e.y, x: e.x}) } );
	//this.connection.send( jsonMsg );
	this._currentTable.clicked(e);
};

/** Handle map movement
 *	Drag the map to the left, e.deltaX is Negative
 *  Drag the map to the right, e.deltaX is Positive
 *  Drag the map up, e.deltaY is Negative
 *  Drag the map down, e.deltaY is Positive
 */
_p.onMove = function(e) {

};




















/**
 * 				THE GAME'S MAIN LOOP
 */

/** The Parent of the game loop - This keeps the loop going */
_p.animate = function(t) {
	requestAnimationFrame(this._boundAnimate); // que this method again
	this.updateWorld(); // update game logic
	this.updateRender(); // redraw everything where its supposed to go ( might have changed )
};

/** Updates the Game's logic **/
_p.updateWorld = function() {
	this._currentTable.updateLogic();
};

/** This is what redraws everything */
_p.updateRender = function() {
	this.clear();
	//this._ctx.drawImage(this.imageManager.get("background"), 0, 0, 1200, 801, 0, 0, this._canvas.width, this._canvas.height); // green felt
	this._ctx.drawImage(this.imageManager.get("background"), 0, 0, 1000, 2000, 0, 0, this._canvas.width, this._canvas.height);
	this._currentTable.draw(this._ctx); // redraw all of the WorldObjects, NPCs, PlayerCharacters, etc.
};

























/**
 				NOT WIDELY USED
 */

/* Clears the canvas with the solid black color */
_p.clear = function() {
	//this._ctx.fillStyle = "#81DAFF";
	this._ctx.fillStyle = "#000000";
	this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
};

_p.resizeMainCanvas = function() {
	//this.mapRenderer && this.mapRenderer.setViewportSize(this._canvas.width, this._canvas.height);
	this._currentTable && this._currentTable.setViewportSize(this._canvas.width, this._canvas.height);
		//console.log("------ USEFUL DATA FROM RESIZECANVAS---------");
		//console.log("ViewportScale = " + viewPortScale + ", devicePixelRatio = " + window.devicePixelRatio);
		//console.log("screen.width = " + screen.width + ", screen.height = " + screen.height);
		//console.log("screen.availWidth = " + screen.availWidth + ", screen.availHeight = " + screen.availHeight);
		//console.log("window.outerWidth= " + window.outerWidth + ", window.outerHeight = " + window.outerHeight);
		//console.log("window.innerWidth= " + window.innerWidth + ", window.innerHeight = " + window.innerHeight);
};







/**
 * 					FOR REFERENCE
 */
/** Sends a message to the server instructing it to update a cell since the user has clicked it **/
_p.sendUpdateCell = function(e) {

};


/** IDK how to do this... **/
_p.reorient = function() {

};





_p.passMessage = function(message) {
	if (this._currentTable) {
		this._currentTable.messageReceived(message);
	}
};


_p.enterPressed = function(inputBox) {
	if (this._currentTable) {
		this._currentTable.enterPressed(inputBox);
	}	
};

/** Initialize the connection and sets up the event listeners **/
_p.runConnection = function() {
	// To allow event listeners to have access to the correct scope
	var self = this;
	// if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t ' + 'support WebSockets.'} ));
        return;
    }
 	/** Where to make the connection **/
    //this.connection = new WebSocket('ws://captainlonate1.jit.su:80'); 	
	var host = location.origin.replace(/^http/, 'ws');
	//host = host + ":5000";
	console.log(host);
	this.connection = new WebSocket(host);
    //this.connection = new WebSocket('ws://localhost:8000');
    /** Once the connection is established **/
    this.connection.onopen = function () {
    	// ask the server for the initial world array
        //self.connection.send(JSON.stringify({kind:'getInitialWorld'}));
    	console.log("Web Socket Connection Established");
    	
    };
    /** If there was a problem with the connection */
	this.connection.onerror = function (error) {
        console.log("ERROR with the connection *sadface*");
    };
    /** Incoming messages - How the client should handle the different types of incoming messages**/
    this.connection.onmessage = function (message) {
       	var jsonMessage = JSON.parse(message.data);
       	if (jsonMessage.kind == "initialArray") { // server sends client the initial world array
        	//self._world = JSON.parse(jsonMessage.data);
        	//self.mapRenderer.updateMapData(self._world);
       	}
		self.passMessage(jsonMessage);
    };
}; // end runConnection
