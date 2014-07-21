// Global vars
var stage, map, container, client, selectedTool, nick, drawLayer;
var palette = {};

// Close the socket before the window closes to free up memory
$(window).on('beforeunload', function(){
    client.close();
});

$(document).ready(function() {
	// Init of tactic viewer
	var selector = $("#map-select");
	var rect, down = false;
	
	client = io("http://projects.tankski.co.uk:3000");
	container = $("#canvas-container");
	stage = new Kinetic.Stage({
		container: "canvas-container",
		width: container.width(),
		height: container.width()
	});

	// Init the draw layer and add it to the stage
	drawLayer = new Kinetic.Layer({
		name: "draw"
	});
	drawLayer.add(new Kinetic.Rect({
		x: 0, y: 0,
		width: container.width(),
		height: container.width(),
		name: "drawBounds"
	}));
	stage.add(drawLayer);

	// Setup event handling for the draw layer
	drawLayer.on("mousedown", function(e) {
		if(!nick) return;

		var id = $.now();

		switch(selectedTool) {
			case "ping-map":
				client.emit("pingMap", {
					x: e.evt.layerX, y: e.evt.layerY,
					colour: palette["ping-map-colour"],
					from: nick
				});
				break;
			case "draw-square":
				// Start drawing a rect on the client
				var colour = palette["draw-csq-opts-colour"];

				down = true;
				rect = new Kinetic.Rect({
					name: "rect" + id,
					x: e.evt.layerX, y: e.evt.layerY,
					width: 1, height: 1,
					fill: "rgba(" + colour.r + ", " + 
						colour.g + ", " + 
						colour.b + ", 1)",
					draggable: true
				});

				// Set on drag listeners for the rect and draw it
				rect.on("dragstart", function(e) {
					e.target.moveToTop();
				});
				rect.on("dragend", function(e) {
					client.emit("dragNode", {
						name: e.target.attrs.name,
						x: e.target.attrs.x, y: e.target.attrs.y,
						from: nick
					});
				});

				drawLayer.add(rect);
				break;
		}
	});

	drawLayer.on("mousemove", function(e) {
		if(!down) return;

		switch(selectedTool) {
			case "draw-square":
				// Update the rect being drawn on the client
				var pos = rect.attrs;

				rect.setWidth(e.evt.layerX - pos.x);
				rect.setHeight(e.evt.layerY - pos.y);
				drawLayer.draw();

				break;
		}
	});

	drawLayer.on("mouseup", function(e) {
		down = false;

		switch(selectedTool) {
			case "draw-square":
				// Send the new rect to other clients
				var attrs = rect.attrs;

				client.emit("drawNode", {
					type: "rect",
					x: attrs.x, y: attrs.y,
					width: attrs.width, height: attrs.height,
					fill: attrs.fill, 
					name: attrs.name,
					from: nick
				});
				break;
		}
	});

	// Disable all inputs for disconnected states, enabling them only when connected
	disableInputs(true);

	client.on("connect", function() {
		if(!nick) {
			$("#username-submit, #username-input").prop("disabled", false);
		} else {
			disableInputs(false);
		}
	});
	client.on("disconnect", function() {
		disableInputs(true);
	});

	// Setup map changer
	selector.change(function() {
		map = "../img/" + $(this).find(":selected").val() + ".jpg";
		client.emit("changeMap", {"map": map});
	});

	// Record any changes to the user's submitted nickname
	$("#username-submit").click(function() {
		if($("#username-input").val()) {
			nick = $("#username-input").val();
		} else {
			$("#username-input").val(nick);
		}

		// Hide inputs if the nickname chosen is empty/undefined
		disableInputs(nick ? false : true);

		if(!nick) {
			$("#username-submit, #username-input").prop("disabled", false);
		}
	});

	// Setup tools
	$(".tool").hide();
	$(".btn").click(function() {
		selectedTool = $(this).attr("id");

		// If the button isn't a tool button then hide all tools
		if(!$(this).hasClass("tool")) {
			$(".tool").hide();
		}

		// Remove the active css + apply it to current button if needed
		$(".btn").removeClass("btn-active");
		if(!$(this).hasClass("btn-no-hold")) {
			$(this).addClass("btn-active");

			// If the button is associated with a tool (or set) then show the tool(s)
			if($(this).data("tool")) {
				$("#" + $(this).data("tool")).show();
				$("label[for='" + $(this).data("tool") + "']").show();
			}
		}

		if($(this).attr("id") == "clear-map") {
			// TODO: Clear the map
			client.emit("clearMap", {});
		}
	});
	// Store all colours in associative array and set on change for each picker
	$(".colour-tool").each(function(element) {
		palette[$(this).attr("id")] = hexToRgb($(this).val());
	}).change(function(element) {
		palette[$(this).attr("id")] = hexToRgb($(this).val());
	});

	// Add maps to the map selector using the mappings JSON
	$.ajax({
		url: "../js/mappings.json",
		success: function(data) {
			var mappings = data["maps"];

			$.each(mappings, function(key, value) {
				selector
					.append($("<option></option>")
					.attr("value", value)
					.text(key));
			});
		}
	});

	// Setup socket events
	// Change the map
	client.on("changeMap", function(data) {
		map = data["map"];
		selector.val(map.replace("../img/", "").replace(".jpg", ""));
		changeMap();
	});

	// Clear the map 
	client.on("clearMap", function(data) {
		drawLayer.removeChildren();
		drawLayer.add(new Kinetic.Rect({
			x: 0, y: 0,
			width: container.width(),
			height: container.width(),
			name: "drawBounds"
		}));
		drawLayer.draw();
	});

	// Move a node that has been dragged across screen
	client.on("dragNode", function(data) {
		if(data.from == nick) return;

		// Get the node and place it on top of all siblings
		var shape = drawLayer.find("." + data.name)[0];
		shape.moveToTop();

		// Animate node to new position
		new Kinetic.Tween({
			node: shape,
			duration: 0.25,
			x: data.x, y: data.y,
			easing: Kinetic.Easings.EaseInOut
		}).play();
	});

	// Draw a new node on the map
	client.on("drawNode", function(data) {
		if(data.from == nick) return;

		var shape;

		// Draw different shapes based on the type to be drawn
		switch(data.type) {
			case "rect":
				shape = new Kinetic.Rect({
					x: data.x, y: data.y,
					width: data.width, height: data.height,
					fill: data.fill,
					name: data.name,
					draggable: true
				});

				break;
			default:
				return;
		}

		// Set the on drag listeners for the shape and draw it
		shape.on("dragstart", function(e) {
			e.target.moveToTop();
		});
		shape.on("dragend", function(e) {
			client.emit("dragNode", {
				name: e.target.attrs.name,
				x: e.target.attrs.x, y: e.target.attrs.y,
				from: nick
			});
		});

		drawLayer.add(shape).draw();
	});

	// Add a ping to the map, animate it and remove it
	client.on("pingMap", function(data) {
		var ping = new Kinetic.Circle({
			radius: 5,
			fill: "rgba(" + data.colour.r + ", " + 
				data.colour.g + ", " + 
				data.colour.b + ", 1)",
			x: data.x, y: data.y,
			name: "ping"
		});

		// TODO: Add text

		drawLayer.add(ping);
		drawLayer.draw();		

		new Kinetic.Tween({
			node: ping,
			duration: 0.4,
			radius: 30,
			easing: Kinetic.Easings.EaseInOut,
			opacity: 0,
			onFinish: function() {
				ping.remove();
			}
		}).play();
	});
});

/**
 * Function that enables or disables all inputs on the page
 * @param {Boolean} disable - True to disable inputs, false to enable them.
 */
function disableInputs(disable) {
	$("button, input, select").prop("disabled", disable);
}

/**
 * Function that changes the map to the one provided. Defaults to Karelia.
 */
function changeMap() {
	// Init map to default if its not intialised
	map = map || "../img/01_karelia.jpg";

	// Determine if a map is already loaded
	if(stage.find(".bg").length == 0) {
		var mapLayer = new Kinetic.Layer({
			name: "bg"
		}), mapImageObj = new Image(), 
		overlayImageObj = new Image();

		// Load image into layer and display the new layer
		mapImageObj.onload = function() {
			var mapImage = new Kinetic.Image({
				x: 0, y: 0,
				image: mapImageObj,
				width: 750, height: 750,
				name: "mapImage"
			});

			// Then load the map overlay
			overlayImageObj.onload = function() {
				var overlayImage = new Kinetic.Image({
					x: 0, y: 0,
					image: overlayImageObj,
					width: 750, height: 750,
					name: "overlayImage",
					opacity: 0.5
				});

				// Then set up the map background and render it to the stage
				mapLayer.add(mapImage);
				mapLayer.add(overlayImage);
				stage.add(mapLayer);
				stage.add(drawLayer);
			}
			overlayImageObj.src = "../img/overlay.png";
		};
		mapImageObj.src = map;
	} else {
		// Load image into layer and display the new layer
		var mapImageObj = new Image();

		mapImageObj.onload = function() {
			var bgLayer = stage.find(".bg")[0];

			bgLayer.find(".mapImage").setImage(mapImageObj);
			bgLayer.draw();
		};
		mapImageObj.src = map;
	}

	// If the draw layer is initialised then move it to the front
	if(drawLayer) {
		drawLayer.moveToTop();
	}
}

/**
 * Function that changes a hexadecimal value to rgb values in Object form
 * @param {string} hex - A hexadecimal colour value i.e.: #0000ff
 */
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}