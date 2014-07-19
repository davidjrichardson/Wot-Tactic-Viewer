$(document).ready(function() {
	var $canvas = $("#tactic-viewer"),
		$container = $("#canvas-container"),
		$selector = $("#map-select"),
		$selected, $palette = {};

	// Init canvas & tools
	$canvas.width($container.width());
	$canvas.height($container.width());
	// TODO: Set this to default to the first map alphabetically
	var $source = "../img/01_karelia.jpg";
	updateMap($source, $canvas);
	// Store all colours in associative array and set on change for each picker
	$(".colour-tool").each(function(element) {
		$palette[$(this).attr("id")] = hexToRgb($(this).val());
	}).change(function(element) {
		$palette[$(this).attr("id")] = hexToRgb($(this).val());
	});
	$(".tool").hide();

	// Add maps to the map selector using the mappings JSON
	$.ajax({
		url: "../js/mappings.json",
		success: function(data) {
			var $mappings = data["maps"];

			$.each($mappings, function(key, value) {
				$selector
					.append($("<option></option>")
					.attr("value", value)
					.text(key));
			});
		}
	});

	// Change map on new one selected
	$selector.change(function() {
		$source = "../img/" + $(this).find(":selected").val() + ".jpg";
		updateMap($source, $canvas);
	});

	// Handle tool button click
	$(".btn").on("click", function() {
		$selected = $(this).attr("id");

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
			// Remove all elements from the canvas through redisplaying the map
			updateMap($source, $canvas);
		}
	});

	// Handle canvas clicks
	$canvas.on("click", function(event) {
		switch($selected) {
			case "draw-square":
				// TODO: Get colour for square/circle
				var $rectColour = $palette["draw-csq-opts-colour"];

				$canvas.drawRect({
					layer: true,
					draggable: true,
					bringToFront: true,
					fillStyle: "rgba(" + $rectColour.r + ", " + 
						$rectColour.g + ", " + 
						$rectColour.b + ", 1)",
					dragstart: function(layer) {
						$canvas.animateLayer(layer, {
							fillStyle: "rgba(" + $rectColour.r + ", " + 
								$rectColour.g + ", " + 
								$rectColour.b + ", 0.75)"
						}, 250);
					},
					dragstop: function(layer) {
						$canvas.animateLayer(layer, {
							fillStyle: "rgba(" + $rectColour.r + ", " + 
								$rectColour.g + ", " + 
								$rectColour.b + ", 1)"
						}, 250);
					},
					x: event.offsetX, y: event.offsetY,
					width: 100, height: 100
				});

				$("#" +$selected).removeClass("btn-active").blur();
				$selected = "";

				break;
			case "ping-map":
				var $pingColour = $palette["ping-map-colour"],
					$id = $.now();

				// Draw the ping circle to the map on the ping layer
				$canvas.drawArc({
					layer: true,
					name: "ping" + $id,
					fillStyle: "rgba(" + $pingColour.r + ", " + 
						$pingColour.g + ", " + 
						$pingColour.b + ", 1)",
					x: event.offsetX, y: event.offsetY,
					radius: 10
				});

				// Animate the layer's size and colour then remove it from the canvas
				$canvas.animateLayer("ping" + $id, {
					x: event.offsetX, y: event.offsetY,
					radius: 30,
					fillStyle: "rgba(" + $pingColour.r + ", " + 
						$pingColour.g + ", " + 
						$pingColour.b + ", 0)",
				}, 250, function(layer) {
					$canvas.removeLayer("ping" + $id);
				});

				break;
		}
	});
});

/**
 * Updates/resets canvas with the given source url image for a new map
 * @param {string} $source - The source URL of the map image
 * @param {jCanvas} $canvas - The jCanvas object to be changed
 */
function updateMap($source, $canvas) {
	// Clear all canvas elements
	$canvas.clearCanvas();
	$canvas.removeLayers();
	// Draw new map image to the background layer
	$canvas.drawImage({
		layer: true,
		name: "background",
		index: 0,
		source: $source,
		x: 0, y: 0,
		width: $canvas.width(),
		height: $canvas.height(),
		fromCenter: false
	});
}

/**
 * Function that changes a hexadecimal value to rgb values in Object form
 * @param {string} hex - A hexadecimal colour value i.e.: #0000ff
 */
function hexToRgb($hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec($hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}