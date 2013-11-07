

function TableOne(canvasWidth, canvasHeight, imageManager, connection) {	
	// The canvas's width and height - used in setViewportSize()
	this._canvasWidth = canvasWidth;
	this._canvasHeight = canvasHeight;
	
	this.chatBox = $("#chat");
	this.inputChat = $("#inputBox");
	
	// The imageManager from Game.js - used to create spriteSheets
	this._imageManager = imageManager;
	
	// How to send messages to app.js
	this.connection = connection;

	// Object Renderer
	this.objectRenderer = new WorldObjectRenderer(this._canvasWidth, this._canvasHeight);

	// Define the frames for cards
	this.defineCardPossibilities();

	// Button Frames
	this._buttonFrames = [
		[0, 0, 90, 30, 45, 15]
	];
	this._checkButtonFrames = [
		[0, 0, 60, 20, 30, 10]
	];
	this._dealerFrames = [
		[0, 0, 20, 20, 10, 10]
	];
		
	// Sprite sheets
	this._cardSpriteSheet = new SpriteSheet(this._imageManager.get("cards"), this._cardFrames);
	this._buttonSheet = new SpriteSheet(this._imageManager.get("sitDown"), this._buttonFrames);
	this._checkButtonSheet = new SpriteSheet(this._imageManager.get("check"), this._checkButtonFrames);
	this._dealerSheet = new SpriteSheet(this._imageManager.get("dealer"), this._dealerFrames);
	
	// Locations of where the flop-turn-river cards should go
	// Some constants to help move the flop-turn-river around the board
	baseX = .4*this._canvasWidth;
	this._baseY  = .4*this._canvasHeight;
	this._flop1X = 20+baseX;
	this._flop2X = 40+baseX;
	this._flop3X = 60+baseX;
	this._turnX  = 80+baseX;
	this._riverX = 100+baseX;
	
	this.calculatePlayerPositions();

	this._inputBox = { x: 0, y: 0, visible: false, nameX: 0, nameY: 0 };
	
	this._yourSeatNumber = -1;
	
	this._itsMyTurn = false;
}

_p = TableOne.prototype;











/** 		USER CLICKED			**/
_p.clicked = function(e) {
	// Make sure the user clicked on some sort of object at least
	var objectClickedOn = this.objectRenderer.clickedOnObject(e);
	if (objectClickedOn != false) {		
		/**		If Clicked Sit Down		**/
		if ( (objectClickedOn.getSpriteSheet().getTitle() == "Join") && ( this._yourSeatNumber == -1 ) ) { 
				var jsonMsg = JSON.stringify( {kind:'playerSatDown', data:JSON.stringify( {seat:objectClickedOn.getSlot()}) } );
				this.connection.send( jsonMsg );	
		}
		/**		If Clicked Check		**/
		else if ( (objectClickedOn.getSlot() == "checkButton") && (this._itsMyTurn == true) ) {
			var jsonMsg = JSON.stringify( {kind:'madeTurn', how:"check" } );
			this.connection.send( jsonMsg );	
		}
	}	
};






/**		MESSAGE RECEIVED	**/
_p.messageReceived = function(message) {
	// Telling me I can sit down
	if ( (message.kind === "sitInquiry") && (message.sitInquiry == "true")) {
		// which seat did I just sit at
		this._yourSeatNumber = message.whichSeat;
		// which cards are myCard1 and myCard2
		this.whichCardsAreMine();	
		// create the intputBox
		this.createInputBox();
		// Create dealer token
		this.createDealerToken();
	} 
	// Telling me someone else has sat down
	else if (message.kind === "newOtherPlayer") {
		// hide sit button and display player cards
		this.hideSitButton( message.seatNumber );
	}
	// Telling me it's my turn to play
	else if (message.kind === "yourTurn") {
		console.log("It's my turn apparently.");
		this._itsMyTurn = true;
	}
	// Telling me it's NOT my turn anymore
	else if (message.kind === "notYourTurn") {
		console.log("It's no longer my turn.");
		this._itsMyTurn = false;
	}
	else if (message.kind === "newDealer") {
		console.log("The new dealer is: " + message.dealer);
		this.newDealer(message.dealer);
	}
	else if (message.kind === "completedRotation") {
		console.log("Back to the start. Rotation is complete");
		if( message.currentState == "preflop" ) {
			console.log("Were in the preflop");
			this._flopCard1.setVisible(false);
			this._flopCard2.setVisible(false);
			this._flopCard3.setVisible(false);
			this._turnCard.setVisible(false);
			this._riverCard.setVisible(false);
		}
		else if( message.currentState == "flop" ) {
			console.log("Were in the flop");
			console.log("1: " + message.newCard1 + ", 2: " + message.newCard2 + ", 3: " + message.newCard3);
			this._flopCard1.setVisible(true);
			this._flopCard2.setVisible(true);
			this._flopCard3.setVisible(true);
			this._flopCard1.setFrame(message.newCard1);
			this._flopCard2.setFrame(message.newCard2);
			this._flopCard3.setFrame(message.newCard3);
		}
		else if( message.currentState == "turn" ) {
			console.log("Were in the turn");
			console.log("turn: " + message.newCard1);
			this._turnCard.setVisible(true);
			this._turnCard.setFrame(message.newCard1);
		}
		else if( message.currentState == "river" ) {
			console.log("were in the river");
			console.log("river: " + message.newCard1);
			this._riverCard.setVisible(true);
			this._riverCard.setFrame(message.newCard1);
		}
	}
	// Telling me I've gotten new cards
	else if (message.kind === "issueCards") {
		// Change which cards I have
		this._myCard1.setFrame(message.cardOne);
		this._myCard2.setFrame(message.cardTwo);
	}
	// Telling me someone posted a chat message
	else if (message.kind === "newPost") {
		// Append the post to the chat box
		this.chatBox.append("<br>* " + new Date() + ":: " + message.post);
	}
	else if (message.kind === "resultsMessage") {
		// Append the post to the chat box
		this.chatBox.append("<br>!!RESULTS!! --- " + message.post);
	}
};













/**		HIDE SIT BUTTON && DISPLAY PLAYER CARDS		 **/
_p.hideSitButton = function( seatNumber ) {
	switch( seatNumber ) {
		case 1:
			this._p1Button.setVisible(false);
			this._playerOneCard1.setVisible(true);
			this._playerOneCard2.setVisible(true);
			break;
		case 2:
			this._p2Button.setVisible(false);
			this._playerTwoCard1.setVisible(true);
			this._playerTwoCard2.setVisible(true);
			break;
		case 3:
			this._p3Button.setVisible(false);
			this._playerThreeCard1.setVisible(true);
			this._playerThreeCard2.setVisible(true);
			break;
		case 4:
			this._p4Button.setVisible(false);
			this._playerFourCard1.setVisible(true);
			this._playerFourCard2.setVisible(true);
			break;
		case 5:
			this._p5Button.setVisible(false);
			this._playerFiveCard1.setVisible(true);
			this._playerFiveCard2.setVisible(true);
			break;
	}
};


/**			MAKE CENTER CARDS		 **/
_p.makeCenterCards = function() {
		// flop cards
		this.objectRenderer.addObject( new Card(this._flop1X, this._baseY, this._cardSpriteSheet, 39, false, "flop1") );
		this._flopCard1 = this.objectRenderer.findObjectByTitle("flop1");
		this.objectRenderer.addObject( new Card(this._flop2X, this._baseY, this._cardSpriteSheet, 40, false, "flop2") );
		this._flopCard2 = this.objectRenderer.findObjectByTitle("flop2");
		this.objectRenderer.addObject( new Card(this._flop3X, this._baseY, this._cardSpriteSheet, 41, false, "flop3") );
		this._flopCard3 = this.objectRenderer.findObjectByTitle("flop3");
		// turn card
		this.objectRenderer.addObject( new Card(this._turnX,  this._baseY, this._cardSpriteSheet, 50, false, "turn") );
		this._turnCard = this.objectRenderer.findObjectByTitle("turn");
		// river card
		this.objectRenderer.addObject( new Card(this._riverX,  this._baseY, this._cardSpriteSheet, 51, false, "river") );
		this._riverCard = this.objectRenderer.findObjectByTitle("river");
};


/**			WHICH CARDS ARE MYCARDS		**/
_p.whichCardsAreMine = function() {
	if( this._yourSeatNumber != -1) {
		switch( this._yourSeatNumber ) {
			case '1':
				this._myCard1 = this._playerOneCard1;
				this._myCard2 = this._playerOneCard2;
				break;
			case '2':
				this._myCard1 = this._playerTwoCard1;
				this._myCard2 = this._playerTwoCard2;
				break;
			case '3':
				this._myCard1 = this._playerThreeCard1;
				this._myCard2 = this._playerThreeCard2;
				break;
			case '4':
				this._myCard1 = this._playerFourCard1;
				this._myCard2 = this._playerFourCard2;
				break;
			case '5':
				this._myCard1 = this._playerFiveCard1;
				this._myCard2 = this._playerFiveCard2;
				break;				
		}

	}
};


/**	 		MAKE THE INPUT BOX		**/
_p.createInputBox = function() {
	this._inputBox = { 	x: this._myCard1.getPosition().x+119, 
						y: this._myCard2.getPosition().y-30, 
						visible: true, 
						nameX: this._myCard1.getPosition().x, 
						nameY: this._myCard2.getPosition().y-60 };
						
	this.objectRenderer.addObject( new Button(this._inputBox.x, this._inputBox.y, this._checkButtonSheet, 0, true, "checkButton" ) );
	this._checkButton = this.objectRenderer.findObjectByTitle("checkButton");

};



/**			DRAW		 		**/
_p.draw = function(ctx) {
	this.objectRenderer.draw(ctx);
	
	if ( this._inputBox.visible ) {
		ctx.fillStyle = "white";
    	ctx.fillText(this._players[0].playerName, this._inputBox.nameX, this._inputBox.nameY);
    	// ctx.strokeStyle = "#00FF00";
		// ctx.rect(this._inputBox.x, this._inputBox.y, 20, 20);
		// ctx.fillStyle = "#FF0000";
		// ctx.fillRect(this._inputBox.x, this._inputBox.y,20,20);
		ctx.stroke();
	}
};



/**	Populates an array with information about where to draw each players' stuff	**/
_p.calculatePlayerPositions = function() {
		// Player Locations - Where to draw cards and buttons
	var player1X = .15*this._canvasWidth;// p1
	var player1Y = .15*this._canvasHeight;
	var player1X2 = .15*this._canvasWidth+20;	
	var dealerx = .15*this._canvasWidth+90;
	var dealery = .15*this._canvasHeight+80;
	
	var player2X = .15*this._canvasWidth;// p2
	var player2Y = .65*this._canvasHeight;
	var player2X2 = .15*this._canvasWidth+20;
	var dealer2x = .15*this._canvasWidth+110;
	var dealer2y = .65*this._canvasHeight+40;
	
	var player3X = .5*this._canvasWidth+1;// p3
	var player3Y = .85*this._canvasHeight+1;
	var player3X2 = .5*this._canvasWidth+21;	
	var dealer3x = .5*this._canvasWidth;
	var dealer3y = .85*this._canvasHeight-100;
	
	var player4X = .80*this._canvasWidth;// p4
	var player4Y = .65*this._canvasHeight;
	var player4X2 = .80*this._canvasWidth+20;	
	var dealer4x = .80*this._canvasWidth-130;
	var dealer4y = .65*this._canvasHeight+40;
	
	var player5X = .80*this._canvasWidth;// p5
	var player5Y = .15*this._canvasHeight;
	var player5X2 = .80*this._canvasWidth+20;
	var dealer5x = .80*this._canvasWidth-110;
	var dealer5y = .15*this._canvasHeight+80;
	
	this._players = new Array(5);
	this._players[0] = { card1X: player1X, cardsY: player1Y, card2X: player1X2, dealerX: dealerx, dealerY: dealery, playerName: "Rusty" };
	this._players[1] = { card1X: player2X, cardsY: player2Y, card2X: player2X2, dealerX: dealer2x, dealerY: dealer2y, playerName: "Rusty" };
	this._players[2] = { card1X: player3X, cardsY: player3Y, card2X: player3X2, dealerX: dealer3x, dealerY: dealer3y, playerName: "Rusty" };
	this._players[3] = { card1X: player4X, cardsY: player4Y, card2X: player4X2, dealerX: dealer4x, dealerY: dealer4y, playerName: "Rusty" };
	this._players[4] = { card1X: player5X, cardsY: player5Y, card2X: player5X2, dealerX: dealer5x, dealerY: dealer5y, playerName: "Rusty" };
	
};



_p.createDealerToken = function() {
	// make dealer token
	this.objectRenderer.addObject( new Button(this._players[3].dealerX, this._players[3].dealerY, this._dealerSheet, 0, true, "dealerToken" ) );
	this._dealerToken = this.objectRenderer.findObjectByTitle("dealerToken");
};







/** -------------------------------- --------------------  ---------------------------------**/
/** -------------------------------- WHO CARES BELOW HERE  ---------------------------------**/
/** -------------------------------- --------------------  ---------------------------------**/

/**		ENTRY POINT TO TABLE		**/
_p.run = function() {
	this.makePlayerCards();	
	this.makeCenterCards();		
};

_p.defineCardPossibilities = function() {
	// Frames for the sprite sheets here
	this._cardFrames = [
		[0, 0, 72, 96, 36, 48], // A Club - 0 - 12
		[72, 0, 72, 96, 36, 48], // 2 Club
		[144, 0, 72, 96, 36, 48], // 3 Club
		[216, 0, 72, 96, 36, 48], // 4 Club
		[288, 0, 72, 96, 36, 48], // 5 Club
		[360, 0, 72, 96, 36, 48], // 6 Club
		[432, 0, 72, 96, 36, 48], // 7 Club
		[504, 0, 72, 96, 36, 48], // 8 Club
		[576, 0, 72, 96, 36, 48], // 9 Club
		[648, 0, 72, 96, 36, 48], // 10 Club
		[720, 0, 72, 96, 36, 48], // J Club
		[792, 0, 72, 96, 36, 48], // Q Club
		[864, 0, 72, 96, 36, 48], // K Club - 12
		
		[0, 96, 72, 96, 36, 48], // A Spade - 13 - 25
		[72, 96, 72, 96, 36, 48], // 2 Spade
		[144, 96, 72, 96, 36, 48], // 3 Spade
		[216, 96, 72, 96, 36, 48], // 4 Spade
		[288, 96, 72, 96, 36, 48], // 5 Spade
		[360, 96, 72, 96, 36, 48], // 6 Spade
		[432, 96, 72, 96, 36, 48], // 7 Spade
		[504, 96, 72, 96, 36, 48], // 8 Spade
		[576, 96, 72, 96, 36, 48], // 9 Spade
		[648, 96, 72, 96, 36, 48], // 10 Spade
		[720, 96, 72, 96, 36, 48], // J Spade
		[792, 96, 72, 96, 36, 48], // Q Spade
		[864, 96, 72, 96, 36, 48], // K Spade - 25
		
		[0, 192, 72, 96, 36, 48], // A Hearts - 26 - 38
		[72, 192, 72, 96, 36, 48], // 2 Hearts
		[144, 192, 72, 96, 36, 48], // 3 Hearts
		[216, 192, 72, 96, 36, 48], // 4 Hearts
		[288, 192, 72, 96, 36, 48], // 5 Hearts
		[360, 192, 72, 96, 36, 48], // 6 Hearts
		[432, 192, 72, 96, 36, 48], // 7 Hearts
		[504, 192, 72, 96, 36, 48], // 8 Hearts
		[576, 192, 72, 96, 36, 48], // 9 Hearts
		[648, 192, 72, 96, 36, 48], // 10 Hearts
		[720, 192, 72, 96, 36, 48], // J Hearts
		[792, 192, 72, 96, 36, 48], // Q Hearts
		[864, 192, 72, 96, 36, 48], // K Hearts - 38
		
		[0, 288, 72, 96, 36, 48], // A Diamonds - 39 - 51
		[72, 288, 72, 96, 36, 48], // 2 Diamonds
		[144, 288, 72, 96, 36, 48], // 3 Diamonds
		[216, 288, 72, 96, 36, 48], // 4 Diamonds
		[288, 288, 72, 96, 36, 48], // 5 Diamonds
		[360, 288, 72, 96, 36, 48], // 6 Diamonds
		[432, 288, 72, 96, 36, 48], // 7 Diamonds
		[504, 288, 72, 96, 36, 48], // 8 Diamonds
		[576, 288, 72, 96, 36, 48], // 9 Diamonds
		[648, 288, 72, 96, 36, 48], // 10 Diamonds
		[720, 288, 72, 96, 36, 48], // J Diamonds
		[792, 288, 72, 96, 36, 48], // Q Diamonds
		[864, 288, 72, 96, 36, 48], // K Diamonds - 51
		
		[936, 288, 72, 96, 36, 48] // Back of Card - 52
	];
};



/**		DRAW THE DEALER TOKEN ELSEWHERE		**/
_p.newDealer = function( who ) {
	console.log("Dealer " + who );
	this._dealerToken.setPosition(this._players[who].dealerX, this._players[who].dealerY );
};


/**   ENTER BUTTON PRESSED   **/
_p.enterPressed = function(inputBox) {
	// get a handle on what text is in the box
	var inputBoxValue = inputBox.val();
	// send the message you just typed
	var jsonMsg = JSON.stringify( {kind:'newPost', post:inputBoxValue} );
	this.connection.send( jsonMsg );
	// after you send a message, clear your input box
	this.inputChat.val("");
};

/**
 * Game.js calls this - Here I just pass the message along to the *** renderer
 */
_p.updateLogic = function() {
	
};


/**												**/
_p.setViewportSize = function(canvasWidth, canvasHeight) {
	this.objectRenderer.setViewportSize(canvasWidth, canvasHeight);
};

/**			MAKE PLAYER CARDS		 **/
_p.makePlayerCards = function() {
	// Player one
		this.objectRenderer.addObject( new Button(this._players[0].card1X, this._players[0].cardsY, this._buttonSheet, 0, true, "p1Sit" ) );
		this._p1Button = this.objectRenderer.findObjectByTitle("p1Sit");
		this.objectRenderer.addObject( new Card(this._players[0].card1X, this._players[0].cardsY, this._cardSpriteSheet, 52, false, "p11") );
		this.objectRenderer.addObject( new Card(this._players[0].card2X, this._players[0].cardsY, this._cardSpriteSheet, 52, false, "p12") );
		this._playerOneCard1 = this.objectRenderer.findObjectByTitle("p11");
		this._playerOneCard2 = this.objectRenderer.findObjectByTitle("p12");		

	// Player two
		this.objectRenderer.addObject( new Button(this._players[1].card1X, this._players[1].cardsY, this._buttonSheet, 0, true, "p2Sit" ) );
		this._p2Button = this.objectRenderer.findObjectByTitle("p2Sit");
		this.objectRenderer.addObject( new Card(this._players[1].card1X, this._players[1].cardsY, this._cardSpriteSheet, 52, false, "p21") );
		this.objectRenderer.addObject( new Card(this._players[1].card2X, this._players[1].cardsY, this._cardSpriteSheet, 52, false, "p22") );
		this._playerTwoCard1 = this.objectRenderer.findObjectByTitle("p21");
		this._playerTwoCard2 = this.objectRenderer.findObjectByTitle("p22");

	// Player three
		this.objectRenderer.addObject( new Button(this._players[2].card1X, this._players[2].cardsY, this._buttonSheet, 0, true, "p3Sit" ) );
		this._p3Button = this.objectRenderer.findObjectByTitle("p3Sit");
		this.objectRenderer.addObject( new Card(this._players[2].card1X, this._players[2].cardsY, this._cardSpriteSheet, 52, false, "p31") );
		this.objectRenderer.addObject( new Card(this._players[2].card2X, this._players[2].cardsY, this._cardSpriteSheet, 52,  false, "p32") );
		this._playerThreeCard1 = this.objectRenderer.findObjectByTitle("p31");
		this._playerThreeCard2 = this.objectRenderer.findObjectByTitle("p32");

	// Player four
		this.objectRenderer.addObject( new Button(this._players[3].card1X, this._players[3].cardsY, this._buttonSheet, 0, true, "p4Sit" ) );
		this._p4Button = this.objectRenderer.findObjectByTitle("p4Sit");
		this.objectRenderer.addObject( new Card(this._players[3].card1X, this._players[3].cardsY, this._cardSpriteSheet, 52, false, "p41") );
		this.objectRenderer.addObject( new Card(this._players[3].card2X, this._players[3].cardsY, this._cardSpriteSheet, 52, false, "p42") );
		this._playerFourCard1 = this.objectRenderer.findObjectByTitle("p41");
		this._playerFourCard2 = this.objectRenderer.findObjectByTitle("p42");

	// Player five
		this.objectRenderer.addObject( new Button(this._players[4].card1X, this._players[4].cardsY, this._buttonSheet, 0, true, "p5Sit" ) );
		this._p5Button = this.objectRenderer.findObjectByTitle("p5Sit");
		this.objectRenderer.addObject( new Card(this._players[4].card1X, this._players[4].cardsY, this._cardSpriteSheet, 52, false, "p51") );
		this.objectRenderer.addObject( new Card(this._players[4].card2X, this._players[4].cardsY, this._cardSpriteSheet, 52, false, "p52") );
		this._playerFiveCard1 = this.objectRenderer.findObjectByTitle("p51");
		this._playerFiveCard2 = this.objectRenderer.findObjectByTitle("p52");
};