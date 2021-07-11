var {ipcRenderer, remote} = require('electron');
const open = require('open');
var JSONFormatter =  require('json-formatter-js');

var loadedComposer;

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
	tippy('[data-tippy-content]', { maxWidth: 150, });

	
	$(".resizable_").resizable({
      containment: ".main",
      handles: 'e'
    });

    init();

  	ipcRenderer.on('deliver:array', (event, arg) => { 
        console.log("reached 2")

	  	$("#mainlist").empty();
	  	for (var i = 0; i < arg.length; i++) {
		  	$("#mainlist").append(`
	          <div class="item" data-repo="${arg[i].name}">
	            <input type="text" class="topcoat-text-input" placeholder="text" value="${arg[i].name}" readonly>
	            <input type="text" class="topcoat-text-input grow" placeholder="text" value="${arg[i].url}" readonly>
	            <button class="topcoat-button topcoat-icon-button topcoat-icon-button-ftz openlink" data-target="${arg[i].url}"><a href="#" class='icomatic icon topcoat-icon'>attachment</a></button>
	            <button class="topcoat-button opencomp" data-target="${arg[i].repo_id}">Composer</button>
	          </div>
	        `);
	        //<button class="topcoat-button openinf" data-target="${arg[i].url}">Info</button>
	  	}

	  	$(".openlink").click(function(){
	  		var urlToOpen = $(this).data("target");
			(async () => {
				await open(urlToOpen);
			})();
	  	});

	  	$(".opencomp").click(function(){
			ipcRenderer.send("composer:get", {
		      "url" :  $(this).data("target"),
		      "alias" : $(this).parent().data("repo").replace("zendo-cloud / ", "").trim()
		    });
			/*
	  		$("#compcontainer");
	  		var urlToOpen = $(this).data("target");
			(async () => {
				await open(urlToOpen);
			})();*/
	  	});
  	});

  	ipcRenderer.on('deliver:single', (event, arg) => {
	  	$("#mainlist").append(`
          <div class="item" data-repo="${arg.name}">
            <input type="text" class="topcoat-text-input" placeholder="text" value="${arg.name}" readonly>
            <input type="text" class="topcoat-text-input grow" placeholder="text" value="${arg.url}" readonly>
            <button class="topcoat-button topcoat-icon-button topcoat-icon-button-ftz openlink" data-target="${arg.url}"><a href="#" class='icomatic icon topcoat-icon'>attachment</a></button>
            <button class="topcoat-button opencomp" data-target="${arg.repo_id}">Composer</button>
          </div>
        `);

	  	$(`[data-repo="${arg.name}"] .openlink`).click(function(){
	  		var urlToOpen = $(this).data("target");
			(async () => { await open(urlToOpen); })();
	  	});

	  	$(`[data-repo="${arg.name}"] .opencomp`).click(function(){
			ipcRenderer.send("composer:get", {
		      "url" :  $(this).data("target"),
		      "alias" : arg.name.replace("zendo-cloud / ", "").trim()
		    });
	  	});

	  	if($('#mainlist').parent().scrollTop() + $('#mainlist').parent().innerHeight() >= $('#mainlist').parent()[0].scrollHeight) $('#mainlist').parent().scrollTop($('#mainlist').parent()[0].scrollHeight);
  	});

  	ipcRenderer.on('deliver:composer', (event, arg) => { 
 		$(".editednote").hide();

		const formatter = new JSONFormatter.default(arg, 'Infinity', { theme:'dark' });
		loadedComposer = arg;
		$("#compcontainer").empty();
	  	$("#compcontainer").append(formatter.render());
  	});

  	$("#savecomposer").click(function(){
		ipcRenderer.send("composer:save");
  	});

  	$("#editcomposer").click(function(){
		ipcRenderer.send("composer:edit");
  	});

  	$(document).click(function(e){
	    if($(e.target).closest('a').length){
  			e.preventDefault();

	  		if ($(e.target).closest('a').attr("href") && $(e.target).closest('a').attr("href").startsWith("http")) 
	  			(async () => {
					await open($(e.target).closest('a').attr("href"));
				})();
			else{
				console.log($(this).attr("href"))
			}
	    }
	});
 	
  	ipcRenderer.on('deliver:composer-update', (event, arg) => { 
 		$(".editednote").show();
 		
		const formatter = new JSONFormatter.default(arg, 'Infinity', { theme:'dark' });
		loadedComposer = arg;
		$("#compcontainer").empty();
	  	$("#compcontainer").append(formatter.render());
	});

  	ipcRenderer.on('deliver:directories', (event, arg) => { 
	  	$("#mainlist").empty();

	  	console.log("Directories returned: ", arg);
 		
  		var arg = arg.sort(function(a,b){
			var first = Number(a.substr(0, a.indexOf('.')).replace("test", ""));
		  	var second = Number(b.substr(0, b.indexOf('.')).replace("test", ""));
			return first-second;
		});
  		for (var i = 0; i < arg.length; i++) {
  			if (arg[i].startsWith("test"))
	  			$("#mainlist").append(`
	              <div class="item" data-repo="aladdins">
            		<button class="topcoat-button topcoat-icon-button topcoat-icon-button-ftz mr-5 openlink_server" data-target="${arg[i]}"><a href="#" class='icomatic icon topcoat-icon'>attachment</a></button>
		            <input type="text" class="topcoat-text-input grow" placeholder="text" value="${arg[i]}" readonly="">
		            <button class="topcoat-button projectcomp mr-5" data-dir="${arg[i]}"  data-tippy-content="Create a child project after installing the main project">Child project</button>
		            <button class="topcoat-button installcomp mr-5" data-dir="${arg[i]}"  data-tippy-content="Install the main project">Install</button>
		            <button class="topcoat-button clearcache mr-5" data-dir="${arg[i]}"  data-tippy-content="Clear the asset cache on an installed project">Clear cache</button>
		            <button class="topcoat-button wipecomp" data-dir="${arg[i]}"  data-tippy-content="Erase everything in the project repository">Wipe</button>
		          </div>
             	`);
  		}

		tippy('[data-tippy-content]', {
		  maxWidth: 150,
		});

  		$(".installcomp").click(function(){
  			ipcRenderer.send("servers:install", $(this).data("dir"));
  		});

  		$(".projectcomp").click(function(){
  			ipcRenderer.send("servers:project", $(this).data("dir"));
  		});

  		$(".wipecomp").click(function(){
  			ipcRenderer.send("servers:wipe", $(this).data("dir"));
  		});

  		$(".clearcache").click(function(){
  			ipcRenderer.send("servers:cache", $(this).data("dir"));
  		});

	  	$(`.openlink_server`).click(function(){
	  		var urlToOpen = $(this).data("target");
			(async () => {
				await open("http://" + urlToOpen);
			})();
	  	});
	});

  	ipcRenderer.on('deliver:databases', (event, arg) => { 
	  	$("#mainlist").empty();

	  	console.log("Directories returned: ", arg);
 		
  		for (var i = 0; i < arg.length; i++) {
  			//if (!arg[i].startsWith())
	  			$("#mainlist").append(`
	              <div class="item" data-repo="aladdins">
		            <input type="text" class="topcoat-text-input grow" placeholder="text" value="${arg[i]}" readonly="">
		            <button class="topcoat-button wipedb" data-db="${arg[i]}"  data-tippy-content="Drop database">Drop</button>
		          </div>
             	`);
  		}

		tippy('[data-tippy-content]', {
		  maxWidth: 150,
		});

  		$(".wipedb").click(function(){
  			ipcRenderer.send("databases:drop", $(this).data("db"));
  		});
	});
	
	$("#uploadcomposer").click(function(){
		if (loadedComposer) ipcRenderer.send("composer:upload", loadedComposer);
		else ipcRenderer.send("dialog", {
          "type": 'warning',
          "buttons": ['OK'],
          "message": 'Please select a composer file first!'
        });
  	});

  	$("#viewrepos").click(function(){
		ipcRenderer.send("array:request");
  	});

  	$("#viewservers").click(function(){
		ipcRenderer.send("servers:request", "mainWindow");
  	});

  	$("#viewdbs").click(function(){
		ipcRenderer.send("databases:request");
  	});

	$("#clear-cache").click(function(){
		ipcRenderer.send("cache:clear");
	});

	$("#reload-cache").click(function(){
		ipcRenderer.send("cache:reload");
	});
})();