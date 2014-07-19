$(document).ready(function() {
	var $canvas = $("#tactic-viewer"),
		$container = $("#canvas-container"),
		$selector = $("#map-select"),
		$selected, $palette = {};

	// TODO: Move everything to KineticJS

	// Init canvas & tools
	// TODO: Set this to default to the first map alphabetically
	var $source = "../img/01_karelia.jpg";

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

				$("#" +$selected).removeClass("btn-active").blur();
				$selected = "";

				break;
			case "ping-map":
				var $pingColour = $palette["ping-map-colour"],
					$id = $.now();

				break;
		}
	});
});

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