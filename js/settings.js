var {ipcRenderer, remote} = require('electron');
const dialog = remote.dialog;

const Setsuna = require("setsuna");
var setsuna = new Setsuna({
  dirname: '.utpm_v2'
});

setsuna.initSync();

var sProg = false;

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

  var myCodeMirror = CodeMirror(document.getElementById("codemirror-parent"), {
    value: '',
    mode:  "application/json",
    theme: 'monokai'
  });

  $(".tab-toggler").click(function(){
    $(".tab-to-toggle").removeClass("d-block");
    $($(this).data("target")).addClass("d-block");

    $(".topcoat-tab-bar__button--selected").addClass("topcoat-tab-bar__button").removeClass("topcoat-tab-bar__button--selected");
    $(this).removeClass("topcoat-tab-bar__button").addClass("topcoat-tab-bar__button--selected");
    
    myCodeMirror.refresh();
  });

  setsuna.get("gl_token", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#glbtk").val(data);
  });

  setsuna.get("gl_auth", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#gluser").val(data.user);
    $("#glpass").val(data.pass);
  });

  setsuna.get("svn_auth", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#svnuser").val(data.user);
    $("#svnpass").val(data.pass);
  });

  setsuna.get("ssh_data", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#host").val(data.host);
    $("#port").val(data.port);
    $("#sshuser").val(data.user);
    $("#sshpass").val(data.pass);
  });

  setsuna.get("db_data", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#dbhost").val(data.host);
    $("#phppath").val(data.path);
    $("#dbuser").val(data.user);
    $("#dbpass").val(data.pass);
  });

  setsuna.get("repos", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    myCodeMirror.setValue(data);
  });

  setsuna.get("repodata", ({ data, error }) => {
    if (error) return console.log("ERROR", error);

    $("#repolink").val(data.link);
    $("#compsource").val(data.source);
  });

  $("#save_all").click(function(){
    if (sProg) return;

    sProg = true;

    setsuna.set("gl_token", $("#glbtk").val().trim(), ({ error }) => {
      if (error) return console.log("ERROR", error);

      console.log("Saved Gitlab token");
    });

    setsuna.set("gl_auth", {
      user: $("#gluser").val().trim(),
      pass: $("#glpass").val().trim()
    }, ({ error }) => {
      if (error) return console.log("ERROR", error);

      console.log("Saved Gitlab auth");

      setsuna.set("svn_auth", {
        user:$("#svnuser").val().trim(),
        pass:$("#svnpass").val().trim()
      }, ({ error }) => {
        if (error) return console.log("ERROR", error);

        console.log("Saved SVN auth");

        setsuna.set("ssh_data", {
          host: $("#host").val().trim(),
          port: $("#port").val().trim(),
          user: $("#sshuser").val().trim(),
          pass: $("#sshpass").val().trim()
        }, ({ error }) => {
          if (error) return console.log("ERROR", error);

          console.log("Saved SSH data");

          setsuna.set("db_data", {
            host: $("#dbhost").val().trim(),
            path: $("#phppath").val().trim(),
            user: $("#dbuser").val().trim(),
            pass: $("#dbpass").val().trim()
          }, ({ error }) => {
            if (error) return console.log("ERROR", error);

            console.log("Saved database data");

            setsuna.set("repos", myCodeMirror.getValue(), ({ error }) => {
              if (error) return console.log("ERROR", error);

              console.log("Saved repo data");
              
              setsuna.set("repodata", {
                link: $("#repolink").val().trim(),
                source: $("#compsource").val().trim()
              }, ({ error }) => {
                if (error) return console.log("ERROR", error);

                console.log("Saved repo data");

                sProg = false;
              });
            });
          });
        });
      });
    });

  });
})();