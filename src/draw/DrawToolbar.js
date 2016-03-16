L.DrawToolbar = L.Toolbar.extend({

	statics: {
		TYPE: 'draw'
	},

	options: {
		polyline: {},
		polygon: {},
		rectangle: {},
		circle: {},
		marker: {}
	},

	initialize: function (options) {
		// Ensure that the options are merged correctly since L.extend is only shallow
		for (var type in this.options) {
			if (this.options.hasOwnProperty(type)) {
				if (options[type]) {
					options[type] = L.extend({}, this.options[type], options[type]);
				}
			}
		}

		this._toolbarClass = 'leaflet-draw-draw';
		L.Toolbar.prototype.initialize.call(this, options);
	},

	getModeHandlers: function (map) {
		handlers = [
			this.getDrawHandler(map, 'polyline'),
			this.getDrawHandler(map, 'polygon'),
			this.getDrawHandler(map, 'rectangle'),
			this.getDrawHandler(map, 'circle'),
			this.getDrawHandler(map, 'marker'),
		]
		return handlers;
	},

	getDrawHandler: function(map, type) {
		var capitalizeFirstLetter = function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		};
		var opts = this.options[type];
		if (opts) {
			defaultClass = L.Draw[capitalizeFirstLetter(type)];
			cls = opts.handler || defaultClass;
			return {
				enabled: this.options[type],
				handler: new cls(map, opts),
				title: L.drawLocal.draw.toolbar.buttons[type]
			}
		} else {
			return {enabled: false}
		}
	},

	// Get the actions part of the toolbar
	getActions: function (handler) {
		return [
			{
				enabled: handler.deleteLastVertex,
				title: L.drawLocal.draw.toolbar.undo.title,
				text: L.drawLocal.draw.toolbar.undo.text,
				callback: handler.deleteLastVertex,
				context: handler
			},
			{
				title: L.drawLocal.draw.toolbar.actions.title,
				text: L.drawLocal.draw.toolbar.actions.text,
				callback: this.disable,
				context: this
			}
		];
	},

	setOptions: function (options) {
		L.setOptions(this, options);

		for (var type in this._modes) {
			if (this._modes.hasOwnProperty(type) && options.hasOwnProperty(type)) {
				this._modes[type].handler.setOptions(options[type]);
			}
		}
	}
});
