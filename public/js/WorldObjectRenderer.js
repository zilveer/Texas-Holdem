

/**
 * Basically a WorldObjectRenderer contains a bunch of WorldObjects. It can tell all of the WorldObjects to draw themselves.
 * 
 * I really need to try to minimize the number of WorldObjects that exist upon creation. I need to find a way to stick the trees
 * into the terrain instead of making them objects with properties and such.
 * 
 * @param {Object} objects			The collection of "WorldObjects" that already exist
 * @param {Object} viewportWidth   	The width of the canvas
 * @param {Object} viewportHeight	The height of the canvas
 */
function WorldObjectRenderer(viewportWidth, viewportHeight) {
    this._objects = []; // These are all WorldObjects

	// I expect this to sort the objects based on their y location. This is so objects will be layered, and the lower positioned objects
	// will appear to be in front of the higher positioned objects. This is done via the order in which they are drawn
    this._objects.sort(function(o1, o2) {
        var bounds1 = o1.getBounds();
        var bounds2 = o2.getBounds();
        return (bounds1.y + bounds1.h) - (bounds2.y + bounds2.h);
    });
	// Canvas width and canvas height stored as local variables here
    this._viewportWidth = viewportWidth;
    this._viewportHeight = viewportHeight;
    // X:    + << >> -
    // Y:    + up   down -
    this._x = 0;
    this._y = 0;
}

_p = WorldObjectRenderer.prototype;


_p.move = function(deltaX, deltaY) {
    this._x += deltaX;
    this._y += deltaY;
    //var ogre = this.findObjectBySpriteSheet("ogreSheet");
    //console.log("I'm at: " + ogre.getPosition().x + ", " + ogre.getPosition().y);
};

/**
 * Function that is capable of searching through all known World Objects and performing some action on it 
 */
_p.findObjectBySpriteSheet = function(title) {
	var counter = -1;
	for(var i=0; i<this._objects.length; i++) {
		if( this._objects[i].getSpriteSheet().getTitle() == title) {
			counter = i;
		}
	}
	if (counter != -1) {
		return this._objects[counter];
	}
};


_p.findObjectByTitle = function(title) {
	var counter = -1;
	for(var i=0; i<this._objects.length; i++) {
		if( this._objects[i].getSlot() == title) {
			counter = i;
		}
	}
	if (counter != -1) {
		return this._objects[counter];
	}
};




_p.clickedOnObject = function(e) {
	var counter = -1;
	for(var i=0; i<this._objects.length; i++) {
		if (  (e.x >= this._objects[i].getBounds().x) && 
			  (e.x <= (this._objects[i].getBounds().x+this._objects[i].getBounds().w)) && 
			  (e.y >= this._objects[i].getBounds().y) && 
			  (e.y <= (this._objects[i].getBounds().y+this._objects[i].getBounds().h)) &&
			  (this._objects[i].getVisible() == true)
		   ) {
			//console.log("Found: " + this._objects[i].getSlot());
			counter = i;
		}
	}
	if (counter != -1) {
		return this._objects[counter];
	}
	else {
		return false;
	}
};



/**
 * Game.html has resizeCanvas(), it calls Game.js's resizeMainCanvas() 
 */
_p.setViewportSize = function(width, height) {
    this._viewportWidth = width;
    this._viewportHeight = height;
};

/**
 * Game.js calls this in it's animate() method. 
 */
_p.draw = function(ctx) {
    for (var i = 0; i < this._objects.length; i++) {
        var obj = this._objects[i];
        var pos = obj.getPosition();
        obj.draw(ctx, this._x + pos.x, this._y + pos.y);
    }
 };


_p.getViewPortPosition = function() {
	return {
        x: this._x,
        y: this._y
    };
};

/**
 * I added this in a pinch, it works I think but It's probably buggy haha 
 * @param {Object} ctx
 * @param {Object} object
 */
_p.addObject = function(object) {
	this._objects.push(object);
	this._objects.sort(function(o1, o2) {
        var bounds1 = o1.getBounds();
        var bounds2 = o2.getBounds();
        //return (bounds1.y + bounds1.h) - (bounds2.y + bounds2.h);
         return (bounds1.x + bounds1.w) - (bounds2.x + bounds2.w);
    });
}