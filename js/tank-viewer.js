// Global vars
var stage, map, container, client, selectedTool, nick;

// Close the socket before the window closes to free up memory
$(window).on('beforeunload', function(){
    client.close();
});

$(document).ready(function() {
	// Init of tactic viewer
	var selector = $("#map-select");
	
	client = io("http://projects.tankski.co.uk:3000");
	container = $("#canvas-container");
	stage = new Kinetic.Stage({
		container: "canvas-container",
		width: container.width(),
		height: container.width()
	});

	// Disable all inputs for disconnected states, enabling them only when connected
	disableInputs(true);

	client.on("connect", function() {
		$("#username-submit, #username-input").prop("disabled", false);
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
			console.log("Submitted value is non-empty");
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
	client.on("changeMap", function(data) {
		map = data["map"];
		selector.val(map.replace("../img/", "").replace(".jpg", ""));
		changeMap();
	});
});

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
	if(stage.getLayers().length == 0) {
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
}

/**
 * Function that changes a hexadecimal value to rgb values in Object form
 * @param {string} hex - A hexadecimal colour value i.e.: #0000ff
 */
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec($hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}