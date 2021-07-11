const remote = require('electron').remote; 
var ipcRenderer = require('electron').ipcRenderer;

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
	tippy('[data-tippy-content]', {  maxWidth: 150 });
      
	init();

	ipcRenderer.send("auth:signin", { window: 'authWindow' });

  	ipcRenderer.on('deliver:error', (event, arg) => {
		$(".loader-container").removeClass("d-flex");
  	});

	$("#login").click(function(){
		$(".loader-container").addClass("d-flex");

		if ($("#remember").is(':checked')) ipcRenderer.send("auth:store", $("#gtltk").val());
			
		ipcRenderer.send("auth:signin", {
			data: $("#gtltk").val(),
			window: 'authWindow'
		});
	});
})();