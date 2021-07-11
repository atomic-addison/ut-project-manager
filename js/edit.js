const remote = require('electron').remote; 
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;

const Setsuna = require("setsuna");
var setsuna = new Setsuna({
  dirname: '.utpm_v2'
});

setsuna.initSync();

function init() { 
	$("#minimize-window").click(function(){
		const window = remote.getCurrentWindow();
		window.minimize(); 
	});

	$("#maximize-window").click(function(){
		const window = remote.getCurrentWindow();
		if (!window.isMaximized()) window.maximize();
		else window.unmaximize()
	});

	$("#close-window").click(function(){
		const window = remote.getCurrentWindow();
		window.close();
	});

	$("#exit-app").click(function(){
		const window = remote.getCurrentWindow();
		window.close();
	});

	$("#open-settings").click(function() { ipcRenderer.send("window:settings"); });

	$(document).click(function(e){
		if ($(e.target).parent().hasClass('dropdown-toggle')) {
			if (!$(e.target).siblings(".dropdown-menu").is(":visible")) {
				$(".dropdown-menu").fadeOut(100);
				$(e.target).siblings(".dropdown-menu").show();
			}
			else{
				$(".dropdown-menu").fadeOut(100);
			}
		}
		/*
		else if ($(".dropdown-toggle").find(e.target).length>0 && !$(e.target).siblings(".dropdown-menu").is(":visible")) {
			$(e.target).siblings(".dropdown-menu").show();
		}*/
		else{
			$(".dropdown-menu").fadeOut(100);
		}
	});

	$(".subdown-toggle").mouseover(function(){
		$(this).find(".dropdown-menu-sub").first().fadeIn(100);
	});

	$(".subdown-toggle").mouseleave(function(){
		setTimeout(()=>{
			if (!$(this).is(":hover")) $(this).find(".dropdown-menu-sub").fadeOut(100);
		}, 800);
	});

	$(".dropdown-menu-sub").mouseover(function(){
		$(this).fadeIn(100);
	});
}

(function () {
	tippy('[data-tippy-content]', { maxWidth: 150 });

	init();

	var loadedComposer;
	var myCodeMirror;

  	ipcRenderer.on('deliver:composer', (event, arg) => { 
  		loadedComposer = arg;
		myCodeMirror = CodeMirror(document.getElementById("codemirror-parent"), {
			value: JSON.stringify(arg, null, 2),
			lineNumbers: true,
			foldGutter: true,
			gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
			mode:  "application/json",
			theme: 'monokai'
		});
  	});

  	$("#setdeps").click(function(){
		const altObj = Object.fromEntries(
		  Object.entries(loadedComposer.require).map(([key, value]) => 
		    [`${key}`, key=='php'?value:'*@dev']
		  )
		);
		loadedComposer.require = altObj;
		myCodeMirror.setValue(JSON.stringify(loadedComposer, null, 2));
	});

	$("#reprep").click(function(){
		setsuna.get("repos", ({ data, error }) => {
	        if (error) return console.log("ERROR", error);

	        if (data != '' && data != null) {
	        	if (myCodeMirror.getValue() != "" && myCodeMirror.getValue() != null) {
	        		try{
	        			var editableComposer = JSON.parse(myCodeMirror.getValue());

	        			if (editableComposer.repositories) {
	        				editableComposer.repositories = JSON.parse(data);
	        				myCodeMirror.setValue(JSON.stringify(editableComposer, null, 2));
	        			}
	        			else{
	        				//no repositories field
	        			}
	        		}
	        		catch(e){
	        			//couldnt replace repos
	        		}
	        	}
	        	else{
		        	loadedComposer.repositories = JSON.parse(data);
					myCodeMirror.setValue(JSON.stringify(loadedComposer, null, 2));
	        	}
	        }
	    });
	});

	$("#apply").click(function(){
		ipcRenderer.send("composer:update", myCodeMirror.getValue());
	});

})();