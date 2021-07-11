var {ipcRenderer, remote} = require('electron');
var JSONFormatter =  require('json-formatter-js');

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

var loadedComposer;

(function () {
	tippy('[data-tippy-content]', { maxWidth: 150 });

	init();

	ipcRenderer.send("servers:request", "uploadWindow");

  	ipcRenderer.on('deliver:composer', (event, arg) => { 
  		console.log("saving composer")
  		loadedComposer = arg;
  	});

  	ipcRenderer.on('deliver:directories', (event, arg) => { 
  		var arg = arg.sort(function(a,b){
			var first = Number(a.substr(0, a.indexOf('.')).replace("test", ""));
		  	var second = Number(b.substr(0, b.indexOf('.')).replace("test", ""));
			return first-second;
		});
  		for (var i = 0; i < arg.length; i++) {
  			if (arg[i].startsWith("test"))
	  			$(".dirlist").append(`
	              <button class="topcoat-button upload-dir mb-5" data-dir="${arg[i]}">${arg[i]}</button>
	             `);
  		}
  	});

  	$(document).on('click', '.upload-dir', function(e) {
  		if ($(this).hasClass("selected")) {
  			$('.upload-dir').attr('disabled', false);
  			$(this).removeClass("selected");
  		}
  		else{
	  		$('.upload-dir').attr('disabled', true);
	  		$('[data-dir="'+$(this).data("dir")+'"]').attr('disabled', false).addClass("selected");
  		}
	});

  	$("#upload").click(function(){
  		console.log("apply clicked");

  		console.log(loadedComposer);

		ipcRenderer.send("composer:upload-to-server", {
			dir: $(".selected").data("dir"),
			newComposer: loadedComposer,
			auth: $("#auth").is(':checked'),
			wipe: $("#wipe").is(':checked'),
			db: $("#db").is(':checked')
		});
  	});

})();