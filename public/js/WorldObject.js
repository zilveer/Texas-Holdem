


/**
 * A WorldObject really only contains a sprite sheet full of images, and an index of a frame for that sprite sheet.
 * 
 * If you think about it hierarchically:
 * We have an ImageManager which is really just a sprite sheet with some overhead
 * Next we have a SpriteSheet. This is where we split up the group of sprite sheets into just one sprite sheet
 * Here we have a WorldObject, which is where we cut out a section of a sprite sheet and consider it to be its own "object"
 *
 */
function WorldObject(spriteSheet, frame, x, y) {
    this._spriteSheet = spriteSheet;
    this._frame = frame; // frame may have been a bad name for this, indexOfFrame could have been better, this is an integer value
    this._x = x; // This defines where the object is IN THE WORLD
    this._y = y; 
    
    this.objectTitle = "Not it";
}

_p = WorldObject.prototype;

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


_p.setFrame= function(newFrame) {
	this._frame = newFrame;
};



_p.getBounds = function() {
    return this._spriteSheet.getFrameBounds(this._frame, this._x, this._y);
};


_p.getTitle = function() {
    return this.objectTitle;
};

/**
 * World objects already know what frame corresponds to their registered sprite sheet. It needs not be passed in here.
 * This function is called from WorldObjectRenderer
 * 
 * Here is the way this function is called:
 * 		var pos = obj.getPosition();
        obj.draw(ctx, this._x + pos.x, this._y + pos.y)
   
   FIX THIS LATER!!!
   So as you can see, the x and y coordinates that are passed in to draw() are actually retrieved from getPosition()
   		This is stupid because it's more efficient for me to use this._x and this._y here in draw() than to call getPosition() from another
   		class and then pass the variables right back to myself. I need to fix this later. I'll just pass in the World Object Renderer's x and y and do the 
   		math here locally.
 * 
 * @param {Object} ctx What context to draw inside
 * @param {Object} x where to draw the object on the canas
 * @param {Object} y where to draw the object on the canvas
 */
_p.draw = function(ctx, x, y) {
	// this._frame specifies where in the sprite sheet the "object" exists. It's the set of frames example: [0, 0, 90, 150, 45, 150]
	// x and y are where we want to draw the image IN THE CONTEXT. They are the destination x and y
    this._spriteSheet.drawFrame(ctx, this._frame, x, y);
};