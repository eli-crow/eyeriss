//pixi.js boilerplate code
var resolutionX = 800;
var resolutionY = resolutionX * window.innerHeight/window.innerWidth;
var renderer = PIXI.autoDetectRenderer(resolutionX, resolutionY);
renderer.backgroundColor = 0x000000;
document.body.appendChild(renderer.view);
var stage = new PIXI.Container();



//TODO: Leap loop ought to be responsible for updating 
//the positions/scales, etc of Eyeriss to avoid redundancy
var rightData = [100,100,100, 0];
var leftData = [100,100,100, 0];
Leap.loop(function(frame) {
    for (var i = 0, ii = frame.hands.length; i < ii; i++) {
        var h = frame.hands[i];
        if (h.type === "right") {
           rightData = [
               1.5 * h.stabilizedPalmPosition[0] + resolutionX * .3,
               -((resolutionY + 80) - 2.0 * h.stabilizedPalmPosition[1]),
               h.yaw() * 1.5, 
               h.pitch()
           ];
        } else if (h.type === "left" /*&& h.pinchStrength > 0.65*/) {
           leftData = [
               h.pitch(),
               h.yaw(), 			   
               h.roll(),
               h.stabilizedPalmPosition[1] * 1.45
           ];
        }

    }
});



//store all globals here; anything you need to
//access in multiple events
var eyeriss;
var startTime;

//states;
var hasBlinked = false;

//shader manager
var eyerissShaders;

//event order
initialize();
draw();



function initialize ()
{	
	//a collection of color schemes to be passed
	//to Eyeriss's fragment shader. which scheme
	//is specified in the data-colors attribute
	//of each pattern function script in index.html
	var colors = {
		florida: [	
			1.00, 0.40, 0.34, 1.00,
			0.55, 1.00, 0.00, 1.00,
			0.27, 0.83, 0.85, 1.00,
			0.00, 0.00, 0.00, 1.00	
		],
		royal: [	
			0.19, 0.29, 0.50, 1.00,
			0.36, 0.57, 1.00, 1.00,
			0.89, 0.54, 0.09, 1.00,
			0.00, 0.00, 0.00, 1.00	
		],
		propaganda: [	
			0.67, 0.07, 0.07, 1.00,
			1.00, 1.00, 1.00, 1.00,
			0.89, 0.89, 0.89, 1.00,
			0.00, 0.00, 0.00, 1.00	
		],	
		neon: [	
			0.01, 0.70, 1.00, 1.00,
			0.70, 0.00, 1.00, 1.00,
			0.70, 1.00, 0.00, 1.00,
			0.00, 0.00, 0.00, 1.00	
		]
	}
	
	//get all fragment shaders from html file
	//and before/after boilerplate
	var boilerplateTop = document.getElementById('patternBoilerplateTop').innerHTML;
	var shaderScripts = document.querySelectorAll('script[type="x-shader/x-fragment"].pattern-script');
	var boilerplateBottom = document.getElementById('patternBoilerplateBottom').innerHTML;
	
	//eyerissShaders manages and creates all 
	//glsl scripts found in index.html
	eyerissShaders = {};
	eyerissShaders.shaders = [];
	for (var i = 0, ii = shaderScripts.length; i<ii; i++) {
		eyerissShaders.shaders.push(
			new PIXI.Filter('', boilerplateTop + shaderScripts[i].innerHTML + boilerplateBottom, {
				time: {type: 'f', value: 0},
				resolution: {type: '2f', value: [resolutionX,resolutionY]},
				pupilPosition: {type: '2f', value: [0,0]},
				leftData: {type: '4f', value: leftData},
				eyerissColors: {type: '4fv', value: colors[shaderScripts[i].dataset.colors]}
			})
		)
	}
	eyerissShaders.index = 0;
	eyerissShaders.nextShader = function () {
		eyerissShaders.index = (eyerissShaders.index + 1) % eyerissShaders.shaders.length;
		eyeriss.filters = [eyerissShaders.shaders[eyerissShaders.index]];
	};
	
	
	//create Eyeriss, apply shaders,etc
	var eyeMask = document.getElementById('eyeMask').innerHTML;
    eyeriss = new PIXI.Sprite.fromImage(eyeMask);
    eyeriss.anchor.set(0.5);
    eyeriss.pivot.set(0.5);
    eyeriss.position.set(300);
    eyeriss.filters = [eyerissShaders.shaders[0]];
    stage.addChild(eyeriss);
	
	
	//if user moves mouse, override leap loop data, if any;
	document.addEventListener('mousemove', function (e) {
	var x = e.clientX/window.innerWidth - 0.5;
	var y = -e.clientY/window.innerHeight + 0.5;
	rightData = [
		resolutionX/2 + x * 200,
		-resolutionY/2 + y * 200,
		x * 2,
		y * 2
	];
	leftData = [0, 0, 0, 500];
	})
	document.addEventListener('mousedown', function () {
		eyerissShaders.nextShader();
	})
	
	
    startTime = Date.now();
}



//TODO: all of this can be done in the Leap loop
function draw ()
{	
    requestAnimationFrame(draw);

    updateEye();
    renderer.render(stage);
}



function updateEye() 
{
    //in seconds
    var elapsedTime = (Date.now() - startTime) / 1000;
    eyeriss.filters[0].uniforms.time = elapsedTime;

	
	//TODO: uniforms should be applied to the shader via direct reference.
    eyeriss.filters[0].uniforms.leftData = leftData;
    eyeriss.filters[0].uniforms.pupilPosition = [
		rightData[0] + rightData [2] * 135.0,
		rightData[1] + resolutionY + rightData[3] * 80 
	];
	
	
	//combination of hand data to position and scale oganically
    eyeriss.scale.set( 
        1 + leftData[3] * .001,  
        Math.max(
            -0.8 + leftData[3] / 200 
            + rightData[3] * 0.5
        , 0)
    );
    eyeriss.position.set(
        rightData[0],
		-rightData[1]
    );
	
		
	//executes once when the eye has "blinked"
	if (eyeriss.scale.y > 0) {
		hasBlinked = false;
	} else if (!hasBlinked) {
		eyerissShaders.nextShader();
		hasBlinked = true;	
	}
}