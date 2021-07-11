var {ipcRenderer, remote} = require('electron');
const dialog = remote.dialog;

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
  init();

  ipcRenderer.on('deliver:log', (event, arg) => { 
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    $("#ccontainer").append(`${arg}\n`);
    $('#ccontainer').scrollTop($('#ccontainer')[0].scrollHeight);
  });

  var fadeOutTimeOut;

  new ClipboardJS('#copyconsole', {
    text: function(trigger) {
      if ($("#ccontainer").text()!="") {
        $("#copyconfirm").show();
        clearTimeout(fadeOutTimeOut);
        fadeOutTimeOut = setTimeout(function(){
          $("#copyconfirm").fadeOut();
        }, 3000);
        return $("#ccontainer").text();
      }
    }
  });
})();