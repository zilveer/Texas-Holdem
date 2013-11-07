"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'Nathan-Game';

/** Requires **/
var  webSocketServer = require('websocket').server,
		expr = require("express"),
		xpress = expr(),
		server = require('http').createServer(xpress),
		fs = require('fs');

// Configure express
xpress.configure(function() {
     xpress.use(expr.static(__dirname + "/public"));
     xpress.set("view options", {layout: false});
});

// Handle GET requests to root directory
xpress.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/game.html');
});

// WebSocket Server
var wsServer = new webSocketServer({
    httpServer: server
});

var pport = process.env.PORT || 5000;
//var pport = 5000;

// Set up the http server
server.listen(pport, function(err) {
	if(!err) { console.log("Listening on port " + pport); }
});

console.log("--------------");
console.log("I'm here at!!!!");
console.log(pport);
console.log("--------------");



		/** START SOME GAME LOGIC **/
var clients = [ ]; // list of currently connected clients (users)
var history = [ ];
var seats = new Array(5);
var cards;
defineCards();
seats[0] = {id:-1, occupied:false, connection:0};
seats[1] = {id:-1, occupied:false, connection:0};
seats[2] = {id:-1, occupied:false, connection:0};
seats[3] = {id:-1, occupied:false, connection:0};
seats[4] = {id:-1, occupied:false, connection:0};
var id = 0;
var numPlayers = 0;
var gameRunning = false;
var whoseTurn = 1;
var dealerPosition = -1;
var state = "preflop";
var usedCardBank = new Array(20);

var HIGH_CARD = 1;
var ONE_PAIR = 2;
var TWO_PAIR = 3;
var THREE_OFA_KIND = 4;
var STRAIGHT = 5;
var FLUSH = 6;
var FULL_HOUSE = 7;
var FOUR_OFA_KIND = 8;
var STRAIGHT_FLUSH = 9;

var seat0Cards = [];
var seat1Cards = [];
var seat2Cards = [];
var seat3Cards = [];
var seat4Cards = [];
var flop1Card;
var flop2Card;
var flop3Card;
var turnCard;
var riverCard;

var winningPlayers;


/**
 * On connection established
 */
wsServer.on('request', function(request) { 
	// Accept connection - you should check 'request.origin' to make sure that client is connecting from your website
    var connection = request.accept(null, request.origin); 
	var self = this;
	var myId = ++id;
	// We need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
	console.log("Client number: " + index + " connected. Address: " + connection.remoteAddress);
	
	
    /**			USER HAS SENT A MESSAGE		**/
    connection.on('message', function(message) {    	
        if (message.type === 'utf8') {
        	// Extract the message
        	var json = JSON.parse(message.utf8Data);
        	/**			PLAYER IS TRYING TO SIT DOWN		**/
        	if ( json.kind == 'playerSatDown' ) {
				var sitInfo = JSON.parse(json.data);        			
				switch(sitInfo.seat) {
				case "p1Sit":
					if ( seats[0].occupied == false ) {		
						seats[0].occupied = true;
						seats[0].id = myId;
						seats[0].connection = connection;
						var sendSeat = JSON.stringify({kind:'sitInquiry', sitInquiry:'true', whichSeat:'1'});
						connection.send(sendSeat);
						numPlayers++;
						if (numPlayers > 2) { getUpToDate(0); }
						broadcastPlayerSatDown(1);						
					}
					break;
				case "p2Sit":
					if ( seats[1].occupied == false ) {		
						seats[1].occupied = true;
						seats[1].id = myId;
						seats[1].connection = connection;
						var sendSeat = JSON.stringify({kind:'sitInquiry', sitInquiry:'true', whichSeat:'2'});
						connection.send(sendSeat);
						numPlayers++;
						if (numPlayers > 2) { getUpToDate(1); }
						broadcastPlayerSatDown(2);
					}
					break;
				case "p3Sit":
					if ( seats[2].occupied == false ) {		
						seats[2].occupied = true;
						seats[2].id = myId;
						seats[2].connection = connection;
						var sendSeat = JSON.stringify({kind:'sitInquiry', sitInquiry:'true', whichSeat:'3'});
						connection.send(sendSeat);
						numPlayers++;
						if (numPlayers > 2) { getUpToDate(2); }
						broadcastPlayerSatDown(3);
					}
					break;
				case "p4Sit":
					if ( seats[3].occupied == false ) {		
						seats[3].occupied = true;
						seats[3].id = myId;
						seats[3].connection = connection;
						var sendSeat = JSON.stringify({kind:'sitInquiry', sitInquiry:'true', whichSeat:'4'});
						connection.send(sendSeat);
						numPlayers++;
						if (numPlayers > 2) { getUpToDate(3); }
						broadcastPlayerSatDown(4);
					}
					break;
				case "p5Sit":
					if ( seats[4].occupied == false ) {		
						seats[4].occupied = true;
						seats[4].id = myId;
						seats[4].connection = connection;
						var sendSeat = JSON.stringify({kind:'sitInquiry', sitInquiry:'true', whichSeat:'5'});
						connection.send(sendSeat);
						numPlayers++;
						if (numPlayers > 2) { getUpToDate(4); }
						broadcastPlayerSatDown(5);
					}
					break;
				}
				
				// If the increase in numPlayers means that there are now 2, then the game can begin
				if ( (numPlayers == 2) && (gameRunning == false) ) {
					gameRunning = true;
					runGame();
				} 
				
				
        	} 
			/**		PLAYER HAS MADE THEIR TURN		**/
			else if ( (json.kind == 'madeTurn') && (gameRunning == true) ) {
				if( seats[whoseTurn].id == myId ) { // He can only make a move if its his turn
					//console.log("Player id:" + myId + " has " + json.how + "ed.");
					// Tell him it's not his turn anymore
					var notTurn = JSON.stringify({kind:'notYourTurn'}); // Let the next player know it's his turn
					seats[whoseTurn].connection.send(notTurn);	
					// Figure out who's turn it should be
					determineNextTurn(); 	
					// has there been a completed rotation				
					if( whoseTurn == dealerPosition) {
						//console.log("Reached the dealer again.");
						// There has been a completed rotation...
						if ( state == "preflop" ) {
							state = "flop";
							flop1Card = pickRandomCard();
							flop2Card = pickRandomCard();
							flop3Card = pickRandomCard();
							var rotation = JSON.stringify({kind:'completedRotation', currentState: "flop", newCard1: flop1Card, newCard2: flop2Card, newCard3: flop3Card});
						} else if ( state == "flop" ) {
							state = "turn";
							turnCard = pickRandomCard();
							var rotation = JSON.stringify({kind:'completedRotation', currentState: "turn", newCard1: turnCard});
						} else if ( state == "turn" ) {
							state = "river";
							riverCard = pickRandomCard();
							var rotation = JSON.stringify({kind:'completedRotation', currentState: "river", newCard1: riverCard});
						} else if ( state == "river" ) {
							state = "preflop";
							var rotation = JSON.stringify({kind:'completedRotation', currentState: "preflop"});							
							wsServer.broadcastUTF({ kind:'newPost', post: "Round Over"});							
							// Reset the Round
							usedCardBank = new Array(20);
							
							var playHands = [];
							playHands[0] = 0;
							playHands[1] = 0;
							playHands[2] = 0;
							playHands[3] = 0;
							playHands[4] = 0;
							
							for(var i =0; i<=4; i++) {
								if( (seats[i].occupied == true) ) {		
									var playName;
									var c1;
									var c2;
									if ( i==0 ) {playName="seatZero"; c1=seat0Cards[0]; c2=seat0Cards[1];}
									else if ( i==1 ) {playName="seatOne"; c1=seat1Cards[0]; c2=seat1Cards[1];}
									else if ( i==2 ) {playName="seatTwo"; c1=seat2Cards[0]; c2=seat2Cards[1];}
									else if ( i==3 ) {playName="seatThree"; c1=seat3Cards[0]; c2=seat3Cards[1];}
									else if ( i==4 ) {playName="seatFour"; c1=seat4Cards[0]; c2=seat4Cards[1];}			
									playHands[i] = {player:playName, hand:whatHand(c1, c2, flop1Card, flop2Card, flop3Card, turnCard, riverCard)};
								}					
							}
							// Evaluate the players' hands to see who won
							compareHands(
								playHands[0],
								playHands[1],
								playHands[2],
								playHands[3],
								playHands[4]
							);							
							
							var resultsMessage = "Player sitting at " + winningPlayers[0].player + " won with " + titleToHandName(winningPlayers[0].hand.title) + ".";
							wsServer.broadcastUTF(JSON.stringify({ kind:'resultsMessage', post: resultsMessage}));
									
							// Reset the server's stored cards for players and center 5
							seat0Cards = [];
							seat1Cards = [];
							seat2Cards = [];
							seat3Cards = [];
							seat4Cards = [];
							
							// Give players new cards
							issuePlayersNewCards();
						}
						wsServer.broadcastUTF(rotation);
						//seats[whoseTurn].connection.send(rotation);	
					}
					// Tell this guy it's now his turn
					var sendSeat = JSON.stringify({kind:'yourTurn'}); // Let the next player know it's his turn
					seats[whoseTurn].connection.send(sendSeat);		
										
					var yourDealer = JSON.stringify({kind:'newDealer', dealer: whoseTurn});
					wsServer.broadcastUTF(yourDealer);		
				}
			}
			/**		PLAYER HAS POSTED A MESSAGE		**/
			else if ( json.kind == 'newPost' ) {
				var newPost = json.post;
				wsServer.broadcastUTF(JSON.stringify({ kind:'newPost', post: newPost}));
			}			
        } 
    });
    
    
    
    /**			USER HAS CLOSED CONNECTION		**/
    connection.on('close', function(connection) {
        console.log("Client: " + index + " : ID:" + myId + " disconnected.");
		// Find out which seat they were sitting at, if any, and make that seat available again
		for( var i=0; i<=4; i++) {
			if( seats[i].id == myId) {
				console.log("Relieving seat: " + i + " from ID: " + myId);
				seats[i].id = -1;
				seats[i].occupied = false;
				numPlayers--;
				// if the loss in players has resulted in less than 2, then the game logic cannot continue
				if (numPlayers<2) {
					gameRunning = false;
				}
			}
		}		
        // remove user from the list of connected clients
        clients.splice(index, 1);
    });
    
});



/** Gets the game going once there are 2 players **/
function runGame() {
	determineFirstTurn(); // Pick a first player
	// Give all players new cards	
	issuePlayersNewCards();
	var sendSeat = JSON.stringify({kind:'yourTurn'}); // Let that player know it's his turn
	seats[whoseTurn].connection.send(sendSeat);
	var yourDealer = JSON.stringify({kind:'newDealer', dealer: whoseTurn});
	wsServer.broadcastUTF(yourDealer);
	// Now nothing to do, but wait to hear that he has finished making his turn from the 'madeTurn' message
}


/**		GET THE PLAYER UP TO DATE		**/
function getUpToDate( whichNewPlayer ) {
	if ( gameRunning ) {	
		for(var i =0; i<=4; i++) {
			if( (seats[i].occupied == true) && (i != whichNewPlayer) ) {					
				var broadcastNumber  = i+1;
				var newPlayer = JSON.stringify({ kind:'newOtherPlayer', seatNumber: broadcastNumber });
				seats[whichNewPlayer].connection.send(newPlayer);
			}					
		}			
		var yourDealer = JSON.stringify({kind:'newDealer', dealer: whoseTurn});
		wsServer.broadcastUTF(yourDealer);			
		var card1 = pickRandomCard();
		var card2 = pickRandomCard();
		if(whichNewPlayer==0) {
			seat0Cards.push(card1);
			seat0Cards.push(card2);
		}
		else if(whichNewPlayer==1) {
			seat1Cards.push(card1);
			seat1Cards.push(card2);
		}
		else if(whichNewPlayer==2) {
			seat2Cards.push(card1);
			seat2Cards.push(card2);
		}
		else if(whichNewPlayer==3) {
			seat3Cards.push(card1);
			seat3Cards.push(card2);
		}
		else if(whichNewPlayer==4) {
			seat4Cards.push(card1);
			seat4Cards.push(card2);
		}
		var sendSeat = JSON.stringify({kind:'issueCards', cardOne: card1, cardTwo: card2});
		seats[whichNewPlayer].connection.send( sendSeat );	
	}
}



/**			GIVES ALL CURRENT PLAYERS NEW CARDS		**/
function issuePlayersNewCards() {
	for(var i =0; i<=4; i++) {
		if(seats[i].occupied == true) {
			var card1 = pickRandomCard();
			var card2 = pickRandomCard();			
			//console.log("Seat " + i + " is getting: " + card1 + ", and " + card2 + ".");
			//console.log("Card 1 is: " + cards[card1].name + " of " + cards[card1].suit + ", Card 2 is: " + cards[card2].name + " of " + cards[card2].suit + "\n");			
			if(i==0) {
				seat0Cards.push(card1);
				seat0Cards.push(card2);
			}
			else if(i==1) {
				seat1Cards.push(card1);
				seat1Cards.push(card2);
			}
			else if(i==2) {
				seat2Cards.push(card1);
				seat2Cards.push(card2);
			}
			else if(i==3) {
				seat3Cards.push(card1);
				seat3Cards.push(card2);
			}
			else if(i==4) {
				seat4Cards.push(card1);
				seat4Cards.push(card2);
			}			
			var newCards = JSON.stringify({kind:'issueCards', cardOne: card1, cardTwo: card2});
			seats[i].connection.send(newCards);
		}					
	}	
}






/**	
 * 	THIS COULD HONESTLY USE SOME MORE TESTING LOL
 */


debugHands();


function debugHands() {
	//var highC ={player:"playerThree", hand: whatHand (32, 41, 29, 50, 4, 9, 26)}; // High Card - K
	//var highC2 ={player:"playerFour", hand: whatHand (32, 41, 29, 51, 4, 9, 24)}; // High Card - K
	//var highC3 ={player:"playerFive", hand: whatHand (32, 41, 29, 51, 8, 9, 24)}; // High Card - K
	
	//var oneP = {player:"playerTwo", hand:whatHand (36, 43, 20, 51, 0, 43, 14)}; // One Pair - 6's	
	//var oneP2 = {player:"playerThree", hand:whatHand (36, 31, 20, 51, 0, 44, 14)}; // One Pair - 6's	
	//var oneP3 = {player:"playerFour", hand:whatHand (36, 43, 22, 50, 0, 43, 14)}; // One Pair - 6's	
	
	//var twoP = {player:"playerOne", hand:whatHand (1, 26, 8, 13, 21, 14, 35)}; // Two pair - A and 9
	//var twoP2 = {player:"playerTwo", hand:whatHand (1, 25, 8, 13, 21, 14, 35)}; // Two pair - A and 9
	//var twoP3 = {player:"playerThree", hand:whatHand (14, 26, 8, 13, 21, 14, 35)}; // Two pair - A and 9
	//var twoP4 = {player:"playerFour", hand:whatHand (35, 26, 8, 13, 21, 14, 35)}; // Two pair - A and 9
	//var twoP5 = {player:"playerFive", hand:whatHand (35, 26, 8, 13, 21, 14, 35)}; // Two pair - A and 9
	
	//var threeKin = {player:"playerSeven", hand:whatHand (13, 22, 39, 51, 0, 44, 14)}; // Three of a Kind - A's
	//var threeKin2 = {player:"playerTen", hand:whatHand (1, 47, 34, 21, 28, 32, 51)}; // Three of a Kind - 9's
	//var threeKin3 = {player:"playerFive", hand:whatHand (1, 20, 34, 20, 28, 20, 51)}; // Three of a Kind - 8's
	//var threeKin4 = {player:"playerTwo", hand:whatHand (1, 47, 34, 21, 28, 32, 51)}; // Three of a Kind - 9's
	
	// var strat = {player:"playerSix", hand:whatHand (17, 3, 31, 19, 39, 38, 28)}; // Straight	
	// var strat2 = {player:"playerSeven", hand:whatHand (44, 48, 45, 29, 27, 28, 30)}; // Straight
	// var strat3 = {player:"playerEight", hand:whatHand (28, 45, 47, 46, 31, 30, 29)}; // Straight
	// var strat4 = {player:"playerNine", hand:whatHand (35, 5, 8, 33, 6, 50, 39)}; // Straight
	
	// var flsh = {player:"playerOne", hand:whatHand ( 2, 4, 5, 8, 32, 9, 51)}; // Flush - Diamonds
	// var flsh2 = {player:"playerTwo", hand:whatHand ( 18, 41, 42, 43, 32, 50, 51)}; // Flush - Diamonds
	// var flsh3 = {player:"playerThree", hand:whatHand ( 13, 14, 15, 18, 35, 19, 44)}; // Flush - s
	// var flsh4 = {player:"playerFour", hand:whatHand ( 26, 28, 42, 29, 30, 31, 51)}; // Flush - h
	
	// var fullHse = {player:"playerFive", hand:whatHand (1, 14, 27, 11, 24, 7, 13)}; // Full House - 3x2's & 2xQ's	
	// var fullHse2 = {player:"playerSix", hand:whatHand (50, 37, 27, 24, 40, 20, 21)}; // Full House - 
	// var fullHse3 = {player:"playerSeven", hand:whatHand (11, 14, 18, 44, 21, 34, 31)}; // Full House - 
	// var fullHse4 = {player:"playerEight", hand:whatHand (5, 14, 1, 18, 27, 39, 41)}; // Full House -
	
	// var fourKin = {player:"playerSeven", hand:whatHand (36, 33, 26, 39, 0, 44, 13)}; // Four of a Kind - A's
	// var fourKin2 = {player:"playerEight", hand:whatHand (6, 19, 32, 45, 28, 27, 46)}; // Four of a Kind - A's
	// var fourKin3 = {player:"playerNine", hand:whatHand (37, 34, 27, 40, 1, 45, 14)}; // Four of a Kind - A's
	
	
	//var stratFlsh = {player:"playerFour", hand:whatHand (2, 16, 4, 5, 6, 7, 13)}; // Straight-Flush	
	
	//compareHands( fourKin, fourKin2, fourKin3, 0, 0);
}


/**
 * The end result of compareHands is an array containing all of the people who won
 * One pair - just splits pot if multiple people have the same pair
 * Two pair - just splits the pot if multiple people have the same two pair
 */
function compareHands(h1, h2, h3, h4, h5) {
	var playersHands = [];
	if (h1 != 0) {	playersHands.push(h1);	}
	if (h2 != 0) {	playersHands.push(h2);	}
	if (h3 != 0) {	playersHands.push(h3);	}
	if (h4 != 0) {	playersHands.push(h4);	}
	if (h5 != 0) {	playersHands.push(h5);	}
	
	console.log("\n---- Comparing Hands ----");
	playersHands.sort(function(a,b) {
		return a.hand.title - b.hand.title;
	});
	// Print out what each player has
	playersHands.forEach(function(n) {
		//console.log(n);
	});
	console.log("\n");
	// Best hand will be an integer representing one of the constants at the top 
	var bestHand = -1;
	// array that will contain the indexes of each of the players in playersHands that contain the best hand
	var indexsOfBestHand = [];
	
	/* For each players hand - Find the best hand and everybody who has it */
	for(var i = 0, len = playersHands.length; i < len; i++) {		
		// For each type of hand they could have
		for (var j=1; j<=9; j++) { // From the worst hands to the best
			if ( playersHands[i].hand.title === j ) { 			
				if ( j > bestHand) {
					bestHand = j; // The new "best hand"
					indexsOfBestHand = []; // Reset the array of best hands since a new hand has been discovered
				}
				indexsOfBestHand.push(i); // This player has the best hand, remember their index
			}
		}		
	}
	
	winningPlayers = [];

	/* Determine how many winners there were */
	// If there is only one winner
	if ( indexsOfBestHand.length == 1) {
		winningPlayers.push(playersHands[indexsOfBestHand[0]]);
	}
	// else If there are multiple winners, then break the tie depending on what kind of hand it is
	else {
		switch (bestHand) {
			
			/* High Card */
			case 1: 
			console.log("Breaking: " + titleToHandName(1) + " tie.");			
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];			
			var again = true;
			var bestCardSoFar = -1;
			var numHighCardsChecked = 0;
			while ( again ) {				
				if (numHighCardsChecked==0) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card1.value > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card1.value;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card1.value == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}
				}
				else if (numHighCardsChecked==1) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card2.value > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card2.value;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card2.value == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked==2) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card3.value > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card3.value;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card3.value == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked==3) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card4.value > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card4.value;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card4.value == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}				
				}
				else if (numHighCardsChecked==4) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card5.value > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card5.value;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card5.value == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked>4) { // This is officially a tie					
					again = false;
				}								
				// Move to the next card to check								
				numHighCardsChecked++;							
				stillHasWinningHand = anotherArray.slice(0);				
				if ( stillHasWinningHand.length == 1 ) {
					again = false;
				}				
			}			
			// Now that all winners have been added to the array, put it in the winningPlayers array						
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});					
			break;
						
			/* One Pair */
			case 2: 
			console.log("Breaking: " + titleToHandName(2));	
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pair
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.pairValue > bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.pairValue;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.pairValue == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}
			// !!! If multiple people have the same one pair, then pot is split, need to check 3, 4 and 5 card...			
			anotherArray.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
			break;			
			
			/* Two pair */
			case 3: 
			console.log("Breaking: " + titleToHandName(3));
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pairOne
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.pairOneValue > bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.pairOneValue;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.pairOneValue == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}
			// If multiple people had the same pairOne, compare their pairTwos
			if ( anotherArray.length > 1 ) {
				stillHasWinningHand = anotherArray.slice(0);
				anotherArray = [];	
				bestPairSoFar = -1;				
				for (var i=0; i<stillHasWinningHand.length; i++) {						
					if ( playersHands[stillHasWinningHand[i]].hand.pairTwoValue > bestPairSoFar ) {
						bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.pairTwoValue;
						anotherArray = [];
						anotherArray.push( stillHasWinningHand[i] );
					}
					else if ( playersHands[stillHasWinningHand[i]].hand.pairTwoValue == bestPairSoFar ) {
						anotherArray.push( stillHasWinningHand[i] );
					}						
				}				
			}			
			stillHasWinningHand = anotherArray.slice(0);
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
			break;					
			
			/* Three of a kind */
			case 4: 
			console.log("Breaking: " + titleToHandName(4));	
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pair
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.pairValue > bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.pairValue;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.pairValue == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}		
			stillHasWinningHand = anotherArray.slice(0);
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
			break;
			
			/* straight */
			case 5: 
			console.log("Breaking: " + titleToHandName(5));
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pair
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.highEnd > bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.highEnd ;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.highEnd  == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}		
			stillHasWinningHand = anotherArray.slice(0);
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
			break;
			
			/* flush */
			case 6: 
			console.log("Breaking: " + titleToHandName(6));
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];			
			var again = true;
			var bestCardSoFar = -1;
			var numHighCardsChecked = 0;
			while ( again ) {				
				if (numHighCardsChecked==0) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card1> bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card1;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card1 == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}
				}
				else if (numHighCardsChecked==1) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card2 > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card2;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card2 == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked==2) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card3 > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card3;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card3 == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked==3) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card4 > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card4;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card4 == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}				
				}
				else if (numHighCardsChecked==4) {
					anotherArray = [];
					bestCardSoFar = -1;
					for (var i=0; i<stillHasWinningHand.length; i++) {							
						if ( playersHands[stillHasWinningHand[i]].hand.card5 > bestCardSoFar ) {
							bestCardSoFar = playersHands[stillHasWinningHand[i]].hand.card5;
							anotherArray = [];
							anotherArray.push( stillHasWinningHand[i] );
						}
						else if ( playersHands[stillHasWinningHand[i]].hand.card5 == bestCardSoFar ) {
							anotherArray.push( stillHasWinningHand[i] );
						}						
					}					
				}
				else if (numHighCardsChecked>4) { // This is officially a tie					
					again = false;
				}								
				// Move to the next card to check								
				numHighCardsChecked++;							
				stillHasWinningHand = anotherArray.slice(0);				
				if ( stillHasWinningHand.length == 1 ) {
					again = false;
				}				
			}			
			// Now that all winners have been added to the array, put it in the winningPlayers array						
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
			break;
			
			/* full */
			case 7: 
			console.log("Breaking: " + titleToHandName(7));
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pairOne
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.tripleValue > bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.tripleValue;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.tripleValue == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}
			// If multiple people had the same pairOne, compare their pairTwos
			if ( anotherArray.length > 1 ) {
				stillHasWinningHand = anotherArray.slice(0);
				anotherArray = [];	
				bestPairSoFar = -1;				
				for (var i=0; i<stillHasWinningHand.length; i++) {						
					if ( playersHands[stillHasWinningHand[i]].hand.pairValue > bestPairSoFar ) {
						bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.pairValue;
						anotherArray = [];
						anotherArray.push( stillHasWinningHand[i] );
					}
					else if ( playersHands[stillHasWinningHand[i]].hand.pairValue == bestPairSoFar ) {
						anotherArray.push( stillHasWinningHand[i] );
					}						
				}				
			}			
			stillHasWinningHand = anotherArray.slice(0);
			stillHasWinningHand.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});
			break;
			
			/* four */
			case 8: 
			console.log("Breaking: " + titleToHandName(8));	
			var stillHasWinningHand = indexsOfBestHand.slice(0);
			var anotherArray = [];		
			var bestPairSoFar = -1;		
			// First, check everyone's pair
			for (var i=0; i<stillHasWinningHand.length; i++) {							
				if ( playersHands[stillHasWinningHand[i]].hand.fourValue> bestPairSoFar ) {
					bestPairSoFar = playersHands[stillHasWinningHand[i]].hand.fourValue;
					anotherArray = [];
					anotherArray.push( stillHasWinningHand[i] );
				}
				else if ( playersHands[stillHasWinningHand[i]].hand.fourValue == bestPairSoFar ) {
					anotherArray.push( stillHasWinningHand[i] );
				}						
			}
			// !!! If multiple people have the same one pair, then pot is split, need to check 3, 4 and 5 card...			
			anotherArray.forEach(function(n) {
				winningPlayers.push( playersHands[n] );
			});	
					
			break;
			
			/* straight-flush */
			case 9: 
			console.log("Breaking: " + titleToHandName(9));
			break;
		}
	} // end else if there is a tie to break
	
	console.log("\n!!!--- Winning Player Array ----------------!!!");
	console.log(winningPlayers);
	console.log("!!!-----------------------------------------!!!\n");
	// return winningPlayers	
}












 /** Takes 7 cards and determines what hand it makes **/
function whatHand( card1, card2, card3, card4, card5, card6, card7 ) {
	var cardsArray = [ card1, card2, card3, card4, card5, card6, card7 ];
	// Array of cards - contains both values and suits
	var sortedCards = [	{value:cards[cardsArray[0]].value, suit:cards[cardsArray[0]].suit}, 
					{value:cards[cardsArray[1]].value,	suit:cards[cardsArray[1]].suit}, 
					{value:cards[cardsArray[2]].value,	suit:cards[cardsArray[2]].suit}, 
					{value:cards[cardsArray[3]].value,	suit:cards[cardsArray[3]].suit}, 
					{value:cards[cardsArray[4]].value,	suit:cards[cardsArray[4]].suit}, 
					{value:cards[cardsArray[5]].value,	suit:cards[cardsArray[5]].suit}, 
					{value:cards[cardsArray[6]].value,	suit:cards[cardsArray[6]].suit}];
	sortedCards.sort(function(a,b) {
		return a.value - b.value;
	});
	
	/** Search For Pair **/
	var royalStraight = false;
	var flushBool = false;
	var straight = false;
	var fourOfAKind = false;
	var threeOfAKind = false;
	var onePair = false;
	var twoPair = false;
	
	// Populate names array - contains the frequency of each card
	// [ 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A] - size 13
	var names = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];	
	for ( var i=0; i<7; i++ ) { // For each card		
		names[cards[cardsArray[i]].value-2] = (names[cards[cardsArray[i]].value-2] + 1);	
		//console.log(": " + numToName(cards[cardsArray[i]].value) + " " +  cards[cardsArray[i]].suit);	
	}	

	/* CHECK FOR A FLUSH */
	var numHearts = 0;
	var numSpades = 0;
	var numDiamonds = 0;
	var numClubs = 0;	
	var theFlushSuit;	
	var heartflushArray = []; 
	var clubflushArray = []; 
	var diamondflushArray = []; 
	var spadeflushArray = []; 
	var flushArray = [];
	for ( var i=0; i<7; i++ ) {
		switch (cards[cardsArray[i]].suit) {
			case "Spades":
				spadeflushArray.push(cards[cardsArray[i]].value);
				numSpades++;
				break;
			case "Hearts":
				heartflushArray.push(cards[cardsArray[i]].value);
				numHearts++;
				break;
			case "Clubs":
				clubflushArray.push(cards[cardsArray[i]].value);
				numClubs++;
				break;
			case "Diamonds":
				diamondflushArray.push(cards[cardsArray[i]].value);
				numDiamonds++;
				break;
		}
	}	
	if ( numHearts >= 5) {	
		theFlushSuit = "Hearts";	
		flushArray = heartflushArray.slice(0);
		flushBool = true;
	}
	else if ( numSpades >= 5) {	
		theFlushSuit = "Spades";	
		flushArray = spadeflushArray.slice(0);
		flushBool = true;
	}
	else if (numDiamonds >= 5) {	
		theFlushSuit = "Diamonds";	
		flushArray = diamondflushArray.slice(0);
		flushBool = true;
	}
	else if (numClubs >= 5) {	
		theFlushSuit = "Clubs";	
		flushArray = clubflushArray.slice(0);
		flushBool = true;
	}
	flushArray.sort(function(a,b) {
		return b-a;
	});

			
	/* CHECK FOR FOUR OF A KIND */
	// If there is a 4 in the array, there must be a 4 of a kind - it doesn't really matter where
	if( names.indexOf(4) != -1 ) { // but if we did want to know, names.indexOf(4) is where
		var fourKind = names.indexOf(4)+2;		
		fourOfAKind = true;
	}
		
		
	/* STRAIGHT - STRAIGHT FLUSH - ROYAL FLUSH */
	var straightRecord = 1;
	var miniFlush = false;
	var runningTotal = 1;
	var flushSuit = 0;	
	var endOfStraight = -1;
	for ( var i=0; i<6; i++ ) {
		// If the next value is part of a straight
		if( sortedCards[i+1].value == (sortedCards[i].value+1) ) {			
			// If this is our first card of the straight, then set the suit as well
			if (straightRecord == 1) {	flushSuit = sortedCards[i].suit;	}
			// If the next card "in the straight" has the same suit, increment the running total
			if ( (sortedCards[i+1].suit) == flushSuit  ) {	runningTotal++;		}
			// If running Total is 5 now, then apparently there was a flush along with the straight
			if (runningTotal == 5) { miniFlush = true;	}
			// Check for straight
			straightRecord++;				
			if ( straightRecord >= 5) {	straight = true; endOfStraight = sortedCards[i+1].value; }
		}
		else {
			// Handle duplicates - if current value equals next value then they are both duplicates
			if ( ((i-1) >=0) && (sortedCards[i].value == (sortedCards[i+1].value))  ) {
				// Even if they are duplicates, you still want to check the suit
				// If the next card "in the straight" has the same suit, increment the running total
				if ( (sortedCards[i+1].suit) == flushSuit  ) {
					runningTotal++;
				}
				// If running Total is 5 now, then apparently there was a flush along with the straight
				if (runningTotal == 5) {
					miniFlush = true;
				}								
			}
			// What if its not next piece in straight
			else {
				// Reset both runningTotal and straight record.");
				straightRecord = 1;
				runningTotal = 1;
			}
		}		
	}
	
	
	/* CHECK FOR THREE OF A KIND */
	// If there is a 3 in the array, there must be a 3 of a kind - it doesn't really matter where
	if( names.lastIndexOf(3) != -1 ) { // but if we did want to know, names.indexOf(3) is where
		var threelocation = names.lastIndexOf(3)+2;
		threeOfAKind = true;
	}
	
	
	/* CHECK FOR PAIRS */
	if( names.lastIndexOf(2) != -1 ) {
		var pairOne;
		var pairTwo;
		var foundOneAlready = false;
		var foundTwoAlready = false;
		// We have at least one pair
		for ( var i=0; i<13; i++ ) {
			if ( names[i] == 2) {				
				if ( foundTwoAlready == true) {
					pairOne = pairTwo;
					pairTwo = (i+2);
				}
				else if ( foundOneAlready == true) {
					pairTwo = (i+2);
					foundTwoAlready = true;
				}
				else {
					pairOne = (i+2);
					foundOneAlready = true;
				}	
			}
		}			
		if (foundTwoAlready == true ) { 
			//console.log("Pair One " + numToName(pairOne) );
			//console.log("Pair Two " + numToName(pairTwo) + "\n"); 
			var tempPairHolder;
			// Make sure pairOne is the bigger of the two
			if ( pairOne < pairTwo) {
				tempPairHolder = pairOne;
				pairOne = pairTwo;
				pairTwo = tempPairHolder;
			}
			twoPair = true;
		} else {
			//console.log("Pair One " + numToName(pairOne) );
			onePair = true;
		}
	}
		

	/* Determine the results */
	if ( miniFlush && straight ) {
		console.log("There was a Straight-Flush");
		return { title: STRAIGHT_FLUSH
			};
	}
	else if ( fourOfAKind ) {
		console.log("Four of a Kind");
		return { title: FOUR_OFA_KIND,
				 fourValue: fourKind
			};
	}
	else if ( (threeOfAKind && onePair) || (threeOfAKind && twoPair) ) {
		console.log("Full House");
		return { title: FULL_HOUSE,
				tripleValue: threelocation,
				pairValue: pairOne
			};
	}
	else if ( flushBool ) {
		console.log("Flush");
		return { title: FLUSH,
				 suit: theFlushSuit,
				 card1: flushArray[0],
				 card2: flushArray[1],
				 card3: flushArray[2],
				 card4: flushArray[3],
				 card5: flushArray[4]				 
			};
	}
	else if ( straight ) {
		console.log("Straight");
		return { title: STRAIGHT,
				 highEnd: endOfStraight
			};
	}
	else if ( threeOfAKind ) {
		console.log("Three of a Kind with " + threelocation);
		return { title: THREE_OFA_KIND,
				 pairValue: threelocation
			};
	}
	else if ( twoPair ) {
		console.log("Two Pair: " + numToName(pairOne) + ", " + numToName(pairTwo));
		return { title: TWO_PAIR,
				 pairOneValue: pairOne,
				 pairTwoValue: pairTwo
			};
	}
	else if ( onePair ) {
		console.log("One Pair: " + numToName(pairOne));
		return { title: ONE_PAIR,
				 pairValue: pairOne
			};
	}
	else {
		//console.log("Highest card ended up being: " + numToName(highest));
		console.log("High card");
		return { title: HIGH_CARD,
				 card1: sortedCards[6],
				 card2: sortedCards[5],
				 card3: sortedCards[4],
				 card4: sortedCards[3],
				 card5: sortedCards[2]				 
			};
	}
	console.log("\n");
}



function titleToHandName( title ) {
	switch (title){
		case 1:
			return 'High Card';
			break;
		case 2:
			return 'One Pair';
			break;
		case 3:
			return 'Two Pair';
			break;
		case 4:
			return 'Three of a Kind';
			break;
		case 5:
			return 'Straight';
			break;
		case 6:
			return 'Flush';
			break;
		case 7:
			return 'Full House';
			break;
		case 8:
			return 'Four of a Kind';
			break;
		case 9:
			return 'Straigh-Flush';
			break;
		case 10:
			return 'Royal Flush';
			break;		
	}
}


function numToName( num ) {
	switch (num){
		case 2:
			return '2';
			break;
		case 3:
			return '3';
			break;
		case 4:
			return '4';
			break;
		case 5:
			return '5';
			break;
		case 6:
			return '6';
			break;
		case 7:
			return '7';
			break;
		case 8:
			return '8';
			break;
		case 9:
			return '9';
			break;
		case 10:
			return '10';
			break;
		case 11:
			return 'J';
			break;
		case 12:
			return 'Q';
			break;
		case 13:
			return 'K';
			break;
		case 14:
			return 'A';
			break;
	}
}



/** When the game is just starting, pick a first player to go **/
function determineFirstTurn() {
	for(var i =0; i<=4; i++) {
		if(seats[i].occupied == true) {
			whoseTurn = i;
			dealerPosition = i;
			continue;
		}		
	}
}

/**		I'm pretty sure this works now		**/
function determineNextTurn() {
	var done = false;
	for (var i=0; i<4; i++) {
		if (!done) {
			whoseTurn++;
			if( (whoseTurn) > 4 ) { whoseTurn = whoseTurn % 5; }					
			if( seats[whoseTurn].occupied == true) { 
				done = true; 
			}
		}
	}
	//console.log("Next turn is now: " + whoseTurn);
}


/** Possibilities can be between 0 and 51 (inclusive) **/
function pickRandomCard() {
	var randomCard = Math.floor((Math.random()*52));
	while ( usedCardBank.indexOf(randomCard) != -1 ) {
		//console.log(randomCard + " was already in the bank. Getting new card.");
		randomCard = Math.floor((Math.random()*52));
	}
	usedCardBank.push(randomCard);
	//console.log("Dealt Card was: " + randomCard);
	return randomCard;
}

function broadcastPlayerSatDown( message ) {
	wsServer.broadcastUTF(JSON.stringify({ kind:'newOtherPlayer', seatNumber: message }));
}


/** Helper function for escaping input strings */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


function defineCards() {
	cards = new Array(52);
	cards[0] = { value: 14, name:"A", suit:"Clubs" };
	cards[1] = { value: 2, name:"2", suit:"Clubs" };
	cards[2] = { value: 3, name:"3", suit:"Clubs" };
	cards[3] = { value: 4, name:"4", suit:"Clubs" };
	cards[4] = { value: 5, name:"5", suit:"Clubs" };
	cards[5] = { value: 6, name:"6", suit:"Clubs" };
	cards[6] = { value: 7, name:"7", suit:"Clubs" };
	cards[7] = { value: 8, name:"8", suit:"Clubs" };
	cards[8] = { value: 9, name:"9", suit:"Clubs" };
	cards[9] = { value: 10, name:"10", suit:"Clubs" };
	cards[10] = { value: 11, name:"J", suit:"Clubs" };
	cards[11] = { value: 12, name:"Q", suit:"Clubs" };
	cards[12] = { value: 13, name:"K", suit:"Clubs" };
	
	cards[13] = { value: 14, name:"A", suit:"Spades" };
	cards[14] = { value: 2, name:"2", suit:"Spades" };
	cards[15] = { value: 3, name:"3", suit:"Spades" };
	cards[16] = { value: 4, name:"4", suit:"Spades" };
	cards[17] = { value: 5, name:"5", suit:"Spades" };
	cards[18] = { value: 6, name:"6", suit:"Spades" };
	cards[19] = { value: 7, name:"7", suit:"Spades" };
	cards[20] = { value: 8, name:"8", suit:"Spades" };
	cards[21] = { value: 9, name:"9", suit:"Spades" };
	cards[22] = { value: 10, name:"10", suit:"Spades" };
	cards[23] = { value: 11, name:"J", suit:"Spades" };
	cards[24] = { value: 12, name:"Q", suit:"Spades" };
	cards[25] = { value: 13, name:"K", suit:"Spades" };
	
	cards[26] = { value: 14, name:"A", suit:"Hearts" };
	cards[27] = { value: 2, name:"2", suit:"Hearts" };
	cards[28] = { value: 3, name:"3", suit:"Hearts" };
	cards[29] = { value: 4, name:"4", suit:"Hearts" };
	cards[30] = { value: 5, name:"5", suit:"Hearts" };
	cards[31] = { value: 6, name:"6", suit:"Hearts" };
	cards[32] = { value: 7, name:"7", suit:"Hearts" };
	cards[33] = { value: 8, name:"8", suit:"Hearts" };
	cards[34] = { value: 9, name:"9", suit:"Hearts" };
	cards[35] = { value: 10, name:"10", suit:"Hearts" };
	cards[36] = { value: 11, name:"J", suit:"Hearts" };
	cards[37] = { value: 12, name:"Q", suit:"Hearts" };
	cards[38] = { value: 13, name:"K", suit:"Hearts" };
	
	cards[39] = { value: 14, name:"A", suit:"Diamonds" };
	cards[40] = { value: 2, name:"2", suit:"Diamonds" };
	cards[41] = { value: 3, name:"3", suit:"Diamonds" };
	cards[42] = { value: 4, name:"4", suit:"Diamonds" };
	cards[43] = { value: 5, name:"5", suit:"Diamonds" };
	cards[44] = { value: 6, name:"6", suit:"Diamonds" };
	cards[45] = { value: 7, name:"7", suit:"Diamonds" };
	cards[46] = { value: 8, name:"8", suit:"Diamonds" };
	cards[47] = { value: 9, name:"9", suit:"Diamonds" };
	cards[48] = { value: 10, name:"10", suit:"Diamonds" };
	cards[49] = { value: 11, name:"J", suit:"Diamonds" };
	cards[50] = { value: 12, name:"Q", suit:"Diamonds" };
	cards[51] = { value: 13, name:"K", suit:"Diamonds" };
}
