var rad2deg = function(rad) {
return Math.round(rad * 180 / Math.PI, 0);
}

L.Edit = L.Edit || {};

L.Edit.Path = L.Edit.SimpleShape.extend({

	SHAPE_TYPE: 'Path',

	_createMoveMarker: function () {
		this._moveMarker = this._createMarker(this._getCenter(), this.options.moveIcon);
	},

	_createResizeMarker: function () {
		this._resizeMarkers = [];
		var corners = this._getCorners();

		if (!this.options.enableResize) {
			// disable resize for all objects
			return;
		}

		for (var i = 0, l = corners.length; i < l; i++) {
			this._resizeMarkers.push(this._createMarker(corners[i], this.options.resizeIcon));
			// Monkey in the corner index as we will need to know this for dragging
			this._resizeMarkers[i]._cornerIndex = i;
		}
	},

    _createRotateMarker: function(latlng) {
		var style, guess;

		if (!this.options.enableRotation) {
			// only enable for rectangle
			return;
		}

		if (!this._angle) {
			this._angle = Math.PI;
			// Find smallest initial angle
			for (var i = 0; i < 4; i++) {
			  guess = this._guessAngle(i);
			  if (
				guess.dx >= 0 && guess.dy <= 0
				// try to make rotate hanler in first quarter
			  ) {
				this._angle = guess.angle;
				this._rotateIndex = i;
				this._dx = guess.dx;
				this._dy = guess.dy;
			  }
			}
		} else {
		  guess = this._guessAngle(this._rotateIndex);
		  this._angle = guess.angle;
		  this._dx = guess.dx;
		  this._dy = guess.dy;
		}

		this._rotateMarker = this._createMarker(
			this._getCenter(),
			this.options.rotateIcon,
			this._dx * 1.5, this._dy * 1.5
		);
		if (L.Edit.LINE_STYLER) {
		  style = L.Edit.LINE_STYLER(this);
		} else {
		  style = {
			dashArray: [3, 3],
			color: '#00afc4',
			weight: 2
		  };
		}
		// rotate line will from center to middle of NE - NW line
		this._rotateLine = L.lineMarker(
			this._getCenter(),
			this._dx * 1.5, this._dy * 1.5,
			style
		);
		this._bindMarker(this._rotateLine);
		return this._markerGroup.addLayer(this._rotateLine);
	  },

	_onMarkerDragStart: function (e) {
		L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, e);

		// save references to the original shape
		this._origLatLngs = this._shape.getLatLngs();
		this._origCenter = this._getCenter();
		this._origAngle = this._angle;

		// Save a reference to the current and opposite point of the resize rectangle
		var corners = this._getCorners(),
			marker = e.target,
			currentCornerIndex = marker._cornerIndex;

		this._oppositeCorner = corners[(currentCornerIndex + 2) % 4];
		this._currentCorner = corners[currentCornerIndex];

		this._toggleCornerMarkers(0, currentCornerIndex);
	},

	_onMarkerDragEnd: function (e) {

		this._toggleCornerMarkers(1);

		this._repositionAllMarkers();

		L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, e);
	},

	_move: function (newCenter) {
		// create translate transform
		var tx = new L.AffineTransform(this._getPrjs()).move(this._origCenter, newCenter);

		// transform points
		this._shape.setLatLngs(tx.apply(this._origLatLngs));

		// Reposition all markers
		this._repositionAllMarkers();
	},

	_resize: function (latlng) {
		// create resize transform
		var tx = new L.AffineTransform(this._getPrjs()).resize(this._oppositeCorner, this._currentCorner, latlng);

		// transform points
		this._shape.setLatLngs(tx.apply(this._origLatLngs));

		// Reposition all markers
		this._repositionAllMarkers();
	},

	_rotate: function (latlng) {
		// create rotate transform
		var tx = new L.AffineTransform(this._getPrjs()).rotateFrom(this._origAngle - Math.PI/2, this._origCenter, latlng);
		this._angle = this._origAngle + tx.getAngle();

		// transform points
		this._shape.setLatLngs(tx.apply(this._origLatLngs));

		// Reposition all markers
		this._repositionAllMarkers();
	},

	_getCorners: function () {
		var bounds = this._shape.getBounds(),
			nw = bounds.getNorthWest(),
			ne = bounds.getNorthEast(),
			se = bounds.getSouthEast(),
			sw = bounds.getSouthWest();

		return [nw, ne, se, sw];
	},

	_toggleCornerMarkers: function (opacity) {
		for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
			this._resizeMarkers[i].setOpacity(opacity);
		}
	},

	_repositionAllMarkers: function () {
		this._repositionResizeMarkers()
		this._repositionMoveMarkers()
		this._repositionRotateMarkers()
	},

	_repositionMoveMarkers: function() {
		if (this._moveMarker) {
			this._moveMarker.setLatLng(this._getCenter());
		}
	},

	_repositionResizeMarkers: function() {
		var corners = this._shape.getLatLngs();
		debugger;
		if (this._resizeMarkers) {
			for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
				this._resizeMarkers[i].setLatLng(corners[i]);
			}
		}
	},

	_repositionRotateMarkers: function() {
		if (this._rotateMarker) {
			var angle = - this._angle,
				center = this._getCenter();
			var rotateLength = 1.5 * Math.sqrt(this._dx * this._dx + this._dy * this._dy);
			var dx = - rotateLength * Math.sin(angle),
				dy = - rotateLength * Math.cos(angle);
			this._rotateMarker.setLatLng(center);
			this._rotateMarker.setOffset(dx, dy);

			this._rotateLine.setLatLng(center);
			this._rotateLine.setMoveTo(dx, dy);
		}
	},

	_getPrjs: function() {
		var self = this;
		return {
			pre : function(latLng) {
				if (L.Util.isArray(latLng)) {
					var result = [], i, length = latLng.length;
					for (i = 0; i < length; i++) {
						result.push(self._map.project(latLng[i]));
					}
					return result;
				} else {
					return self._map.project(latLng);
				}
			},
			post : function(pt) {
				if (L.Util.isArray(pt)) {
					var result = [], i, length = pt.length;
					for (i = 0; i < length; i++) {
						result.push(self._map.unproject(pt[i]));
					}
					return result;
				} else {
					return self._map.unproject(pt);
				}
			}
		};
	},

	_getCenter : function() {
		var center = L.point(0,0);
		var prjs = this._getPrjs();
		var pts = prjs.pre(this._shape.getLatLngs());
		for (var i = 0; i < pts.length; i++) {
			center._add(pts[i]);
		}
		return prjs.post(center._divideBy(pts.length));
	}


});
