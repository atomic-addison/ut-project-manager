var {ipcRenderer, remote} = require('electron');

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

  var authState = true;

  ipcRenderer.on('deliver:config-details', (event, arg) => {
    if (!arg.auth) authState = false;

    console.log("ARG", arg);

    $("#core_domain").val(arg.dir);
    $("#core_db_host").val(arg.host);
    $("#project_db_host").val(arg.host);
    $("#core_db_user").val(arg.db.user);
    $("#core_db_pass").val(arg.db.pass);
    $("#project_db_user").val(arg.db.user);
    $("#project_db_pass").val(arg.db.pass);
    $("#php_path").val(arg.php);

    $("#autofill").click(function(){
      var primaryAlias;
      var serverID = arg.dir.substr(0, arg.dir.indexOf('.'))

      if ($("#project_alias").val() == "" && arg.alias == undefined) {
        ipcRenderer.send("dialog", {
          "type": 'info',
          "buttons": ['OK'],
          "message": 'Please fill the \'alias\' field and try again!'
        });

        return;
      }
      else if ($("#project_alias").val() != "") primaryAlias = $("#project_alias").val();
      else primaryAlias = arg.alias;

      $("#project_alias").val(primaryAlias);
      $("#project_domain").val(primaryAlias + "." + arg.dir);
      $("#admin_email").val("admin@gmail.com");
      $("#tester_email").val("admin@gmail.com");
      $("#core_db_name").val(`${arg.db.user}_${serverID}_${primaryAlias}`);
      $("#project_db_name").val(`${arg.db.user}_${serverID}_${primaryAlias}_project`);
    });

    $("#install").click(function(){
      console.log("Sending");
      if (
        $("#php_path").val().trim()!="" && 
        $("#core_domain").val().trim()!="" && 
        $("#core_db_host").val().trim()!="" && 
        $("#core_db_user").val().trim()!="" && 
        $("#core_db_pass").val().trim()!="" && 
        $("#core_db_name").val().trim()!="" && 
        $("#project_alias").val().trim()!="" && 
        $("#project_domain").val().trim()!="" && 
        $("#project_db_host").val().trim()!="" &&
        $("#project_db_user").val().trim()!="" &&
        $("#project_db_pass").val().trim()!="" &&
        $("#project_db_name").val().trim()!=""
      ){
        ipcRenderer.send("config:upload", {
          "auth" : arg.auth,
          "php-path": $("#php_path").val().trim(),
          "core-config": {
            "domain": $("#core_domain").val().trim(),
            "db-host": $("#core_db_host").val().trim(),
            "db-username": $("#core_db_user").val().trim(),
            "db-password": $("#core_db_pass").val().trim(),
            "db-name": $("#core_db_name").val().trim()
          },
          "project-config": {
            "alias": $("#project_alias").val().trim(),
            "domain": $("#project_domain").val().trim(),
            "tester-email": $("#tester_email").val().trim()!=""?$("#tester_email").val().trim():"tester@gmail.com",
            "admin-email": $("#admin_email").val().trim()!=""?$("#admin_email").val().trim():"admin@gmail.com",
            "db-host": $("#project_db_host").val().trim(),
            "db-username": $("#project_db_user").val().trim(),
            "db-password": $("#project_db_pass").val().trim(),
            "db-name": $("#project_db_name").val().trim()
          }
        });
      }
      else{
        console.log("All fields are required");
      }
    });

  });

})();