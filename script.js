/**
 * Game Parameters
 */
// Layout configurations
var gameAreaWidth = 1000;
var gameAreaHeight = 750;

// The object that appears in the game
var imageFile = "chicken.png";
var objectOriginalSize = 512;
var objectDisplaySize = 120;

// Game parameters
var gameTime = 60000;  // millisecond
var objectVisibleTime = 2000;  // millisecond
var touchMargin = 100;  // pixels

// Posenet Model options
// Refer to https://learn.ml5js.org/docs/#/reference/posenet
var poseNetMultiplier = 0.5;
var poseNetQuantBytes = 4;
var poseNetInputResolution = 193;

/**
 * Setup UI
 */
// the video element (invisible)
var video = document.getElementById("video");
video.width = gameAreaWidth;
video.height = gameAreaHeight;

// canvas for displaying the webcam
var camera = document.getElementById("camera");  
var cameraContext = camera.getContext("2d");
camera.width = gameAreaWidth;
camera.height = gameAreaHeight;

// The overlay canvas for displaying the objects
var overlay = document.getElementById("overlay");
var overlayContext = overlay.getContext("2d");
overlay.width = gameAreaWidth;
overlay.height = gameAreaHeight;

// Create a webcam capture
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
	navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
		video.srcObject = stream;
		video.play();
	});
}

// Audio file
var sound = document.getElementById("sound");

/**
 * Setting up the model PoseNet
 */
// variable for holding the latest pose recognition results
let poses = [];
var modelLoaded = false;

// Create a new poseNet method with a single detection
const poseNetOptions = {
	"multiplier": poseNetMultiplier,
	"quantBytes": poseNetQuantBytes,
	"inputResolution": poseNetInputResolution
}
const poseNet = ml5.poseNet(video, poseNetOptions, function(){
	console.log("PoseNet model loaded.");
	poseNet.singlePose(video);
	modelLoaded = true;
});
poseNet.on("pose", function(results){
	poses = results;
});

/**
 * Setting up the timer and the score counter
 */
var timer = document.getElementById("timer");
var score = document.getElementById("score");
var currentScore = 0;
var startTime = getMillisecond();  // store the start time
var gameInProgress = true;  // a flag indicating if the game is in progress

function getMillisecond() {
	var currentTime = new Date();
	return currentTime.getTime();
}

function getRemainingSeconds() {
	var timeElapsed = getMillisecond() - startTime;
	var timeRemaining = (gameTime - timeElapsed) / 1000;
	return timeRemaining.toFixed(1);
}

function updateTimer() {
	var s = getRemainingSeconds();
	if (s > 0) {
		timer.innerHTML = s;
	} else {
		gameInProgress = false;
		timer.innerHTML = 0.0.toFixed(1);
	}
}

/**
 * Display the object at a random location on the overlay
 * Continue until the time is up
 */
// Load the object image
var image = new Image();
var imageLoaded = false;
image.src = imageFile;
image.onload = function() {
	imageLoaded = true;
}

// location of the object current on screen
// -100 means no object is currently visible
var objectX = -100; 
var objectY = -100;
var hasObjectOnScreen = false;  // a flag indicating whether any object is on screen
var objectOnScreenSince = 0;  // the time since when the current object is on screen

function drawObject() {
	overlayContext.drawImage(
		image, 0, 0,
		objectOriginalSize, objectOriginalSize, // Original size of the image
		objectX, objectY,  // Position on the canvas
		objectDisplaySize, objectDisplaySize  // Size on canvas
	);
}

// A function for generating random integers
function getRandomInt(min, max, avoidMin, avoidMax) {
	var range = max - min;
	var x = Math.floor(Math.random() * range);
	x = x + min;
	while ((x > avoidMin) && (x < avoidMax)) {
		x = Math.floor(Math.random() * range);
		x = x + min;
	}
	return x;
}

// A function to clear the overlay canvas
function clearOverlayCanvas() {
	overlayContext.clearRect(0, 0, overlay.width, overlay.height);
}

function updateObjectStatus() {
	if (!hasObjectOnScreen) {
		// Randomly generate a position
		// Avoiding the center
		objectX = getRandomInt(10, 860, 300, 600);
		objectY = getRandomInt(10, 620, 300, 300);
		drawObject();
		hasObjectOnScreen = true;
		objectOnScreenSince = getMillisecond();
	} else {
		var onScreenTime = getMillisecond() - objectOnScreenSince;
		if (onScreenTime >= objectVisibleTime) {
			clearOverlayCanvas();
			hasObjectOnScreen = false;
		}
	}
}

// A function to check whether the hand has touched any object
function checkHandPositions() {
	var leftWrist = [-100, -100];
	var rightWrist = [-100, -100];
	var leftElbow = [-100, -100];
	var rightElbow = [ -100, -100];

	// Loop through all the poses detected
	for (let i = 0; i < poses.length; i += 1) {
	  	// For each pose detected, loop through all the keypoints
	  	for (let j = 0; j < poses[i].pose.keypoints.length; j += 1) {
			let keypoint = poses[i].pose.keypoints[j];
			if (keypoint.score > 0.5) {
				if (keypoint.part == "leftWrist") {
					leftWrist = [gameAreaWidth - keypoint.position.x, keypoint.position.y]
				}
				if (keypoint.part == "rightWrist") {
					rightWrist = [gameAreaWidth - keypoint.position.x, keypoint.position.y]
				}
				if (keypoint.part == "leftElbow") {
					leftElbow = [gameAreaWidth - keypoint.position.x, keypoint.position.y]
				}
				if (keypoint.part == "rightElbow") {
					rightElbow = [gameAreaWidth - keypoint.position.x, keypoint.position.y]
				}
			}
		}
	}

	// Calculate position of the hand
	var leftHand = [
		(5 * leftWrist[0] - leftElbow[0]) / 4,
		(5 * leftWrist[1] - leftElbow[1]) / 4,
	];
	var rightHand = [
		(5 * rightWrist[0] - rightElbow[0]) / 4,
		(5 * rightWrist[1] - rightElbow[1]) / 4,
	];
	var hands = [leftHand, rightHand];

	// Check if the hand is somewhere near the object
	for (var i = 0; i < hands.length; i++) {
		let x = hands[i][0];
		let y = hands[i][1];
		
		if (
			(Math.abs(x - (objectX + (objectDisplaySize / 2))) < touchMargin) &&
			(Math.abs(y - (objectY + (objectDisplaySize / 2))) < touchMargin)
		) {
			console.log("HIT!");
			sound.play();
			currentScore += 10;
			hasObjectOnScreen = false;
			objectX = -100;
			objectY = -100;
			clearOverlayCanvas();

			// Update the score
			score.innerHTML = currentScore;

			break;
		}
	}
}

/**
 * For debugging
 */
function drawHand(x, y) {
	overlayContext.beginPath();
	overlayContext.lineWidth = 4;
	overlayContext.arc(x, y, 20, 0, 2 * Math.PI);
	overlayContext.stroke();
}

/**
 * A function to keep updating the UI, including
 *  - the video stream from the webcam
 *  - the timer
 *  - the object on screen
 */
function updateUI() {
	if ((modelLoaded) && (imageLoaded)) {
		updateTimer();
		cameraContext.drawImage(video, 0, 0, 1000, 750);
		checkHandPositions();
		updateObjectStatus();
	}
	if (gameInProgress) {
		window.requestAnimationFrame(updateUI);
	}
}

updateUI();
