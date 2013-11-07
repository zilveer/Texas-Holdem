/**
 * This is a card object
 */
function Card(x, y, spriteSheet, frame, isVisible, location) {
	
	this._spriteSheet = spriteSheet; // Sprite sheet - will be card sprite sheet
    
	this._suit; // suit = H hearts, C clubs, S spades, D diamonds
	this._number; // number = A, 1, 2....J, Q, K
		
	this._x = x; // Where should it be drawn
    this._y = y; 	
	
	this._visible = isVisible; // Can it be seen

	this._frame = frame;  // 0 to 51
	
	this.title = location;
}

_p = Card.prototype;





											/** 	GETTERS AND SETTERS     **/
_p.setPosition = function(x, y) {
    this._x = x;
    this._y = y;
};

_p.getPosition = function() {
    return {
        x: this._x,
        y: this._y
    };
};

_p.getSpriteSheet = function() {
	return this._spriteSheet;
};

_p.setSpriteSheet = function(newSpriteSheet) {
	this._spriteSheet = newSpriteSheet;
};

_p.getBounds = function() {
	//var what = this._spriteSheet.getFrameBounds(this._frame, this._x, this._y);
	//console.log("x thing is: " + what.x);
    return this._spriteSheet.getFrameBounds(this._frame, this._x, this._y);
};

_p.setFrame= function(newFrame) {
	this._frame = newFrame;
};

_p.whichCard = function() {
	return {
		suit: this._suit,
		number: this._number
	};
};

_p.setVisible = function(isVisible) {
	this._visible = isVisible;
};

_p.getVisible = function() {
	return this._visible;
};

_p.getSlot = function() {
	return this.title;
};


																/**		Draw		**/
/**
 * @param ctx What context to draw inside
 * @param x where to draw the object on the canas
 * @param y where to draw the object on the canvas
 */
_p.draw = function(ctx, x, y) {
	// this._frame specifies where in the sprite sheet the "object" exists. It's the set of frames example: [0, 0, 90, 150, 45, 150]
	// x and y are where we want to draw the image IN THE CONTEXT. They are the destination x and y
	if (this._visible) {
		this._spriteSheet.drawFrame(ctx, this._frame, x, y);
	}
    
};