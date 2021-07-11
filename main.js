const electron = require('electron');
var {app, BrowserWindow, ipcMain, dialog} = electron;
const fs = require('fs');
var path = require('path');
var os = require("os");

var mysql2 = require('mysql2');
var Client2 = require('ssh2').Client;
var ssh2 = new Client2();

var node_ssh = require('node-ssh');
var ssh = new node_ssh();

var mainWindow, authWindow, settingsWindow, editWindow, uploadWindow, consoleWindow, configWindow;

var request = require('request');

var HTMLParser = require('node-html-parser');

const Setsuna = require("setsuna");
var setsuna = new Setsuna({
  dirname: '.utpm_v2'
});

setsuna.initSync();

String.prototype.lpad = function(padString, length) {
  var str = this;
  while (str.length < length)
    str = padString + str;
  return str;
}
function tmst(){
  var d = new Date();
  return `[${d.getHours()}:${d.getMinutes()}:${String(d.getSeconds()).lpad("0", 2)}] `;
}

function tunnel(dbOBJ, sshOBJ){
  var tunnel_connection;
  console.log(tmst() + "Setting up a promise for the tunnel...");
  return new Promise(function(resolve, reject){
    ssh2.once('keyboard-interactive', (name, instructions, lang, prompts, finish) => { 
      console.log(tmst() + "Got a request for keyboard input, responding...");
      finish([sshOBJ.pass]); 
    });

    ssh2.once('ready', function() {
      console.log(tmst() + "SSH connection established, forwarding out a stream...");
      ssh2.forwardOut(
        sshOBJ.host,
        sshOBJ.port,
        dbOBJ.host, 
        3306,
        function (err, stream) {
          if (err) return console.log(tmst() + "Error creating SSH stream: ", err);

          console.log(tmst() + "Stream forwarded out, connecting to MySQL...");
          tunnel_connection = mysql2.createConnection({
            host     : dbOBJ.host,
            user     : dbOBJ.user,
            password : dbOBJ.pass,
            stream: stream
          });

          tunnel_connection.connect(function(err){
            if (err) {
              console.log(tmst() + "Error connecting to MySQL: ", err);
              console.log(tmst() + "Rejecting promise...");
              reject(err);
            }
            else {
              console.log(tmst() + "Connected successfully! Resolving...");
              resolve({
                connection: tunnel_connection,
                ssh: ssh2
              });
            }
          });
        }
      );
    }).connect({
      host: sshOBJ.host,
      port: sshOBJ.port,
      tryKeyboard: true,
      username: sshOBJ.user,
      password: sshOBJ.pass
    });
  });
}

var mainWindowReady = false;

ipcMain.on('cache:clear', (event, arg) => {
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to clear the project list cache?'}).then(i => {
    console.log(i.response);
    if (i.response==0) {
      //clearing project list cache
      project.deleteCachedGroupData();
    }
  });
});

ipcMain.on('cache:reload', (event, arg) => {
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to reload the project list cache?'}).then(i => {
    if (i.response==0) {
      //reloading project list cache
      project.reloadCachedGroupData();
    }
  });
});

function createMainWindow () {
  mainWindow = new BrowserWindow({
    width: 1000, 
    height: 600, 
    frame: false, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  mainWindow.on('close', function() { 
    //if (uploadWindow != null) uploadWindow.close();
    if (authWindow != null) authWindow.close();
    if (settingsWindow != null) settingsWindow.close();
    if (editWindow != null) editWindow.close();

    mainWindow = null;
  });
}

function createConfigWindow(sentData) {
  configWindow = new BrowserWindow({
    width: 535, 
    height: 535, 
    frame: false, 
    resizable:true, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  configWindow.loadFile('config.html');

  configWindow.on('closed', function () {
    configWindow = null;
  });

  configWindow.webContents.once('dom-ready', () => {
    configWindow.webContents.send('deliver:config-details', sentData);
  });
}

function createAuthWindow () {
  authWindow = new BrowserWindow({
    width: 200, 
    height: 300, 
    frame: false, 
    resizable:true, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  authWindow.loadFile('auth.html');

  authWindow.on('closed', function () {
    authWindow = null;
  });
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 500, 
    height: 400, 
    frame: false, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', function () {
    settingsWindow = null;
  });
}

function createConsoleWindow() {
  consoleWindow = new BrowserWindow({
    width: 650, 
    height: 400, 
    frame: false, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  consoleWindow.loadFile('console.html');

  consoleWindow.on('closed', function () {
    consoleWindow = null;
  });
}

function createEditWindow (composerdata) {
  editWindow = new BrowserWindow({
    width: 600, 
    height: 600, 
    frame: false, 
    resizable:true, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  editWindow.loadFile('edit.html');

  editWindow.on('closed', function () {
    editWindow = null;
  });

  editWindow.webContents.once('dom-ready', () => {
    console.log("attempting to deliver composer data");
    editWindow.webContents.send('deliver:composer', composerdata);
  });
}

function createUploadWindow (composerdata) {
  uploadWindow = new BrowserWindow({
    width: 350, 
    height: 350, 
    frame: false, 
    resizable:true, 
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, '/assets/img/icon64x64.png')
  });

  uploadWindow.loadFile('upload.html');

  uploadWindow.on('closed', function () {
    uploadWindow = null;
  });

  uploadWindow.webContents.once('dom-ready', () => {
    console.log("attempting to deliver composer data to upload");
    uploadWindow.webContents.send('deliver:composer', composerdata);
  });
}

function runProcess(){ if (authWindow == null) createAuthWindow(); }

app.on('ready', runProcess);
app.on('activate', runProcess);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});



var mainURL = 'http://svn.ukrtech.info/uticms/install/projects/';
var subDir = 'contr/';

var repodata = setsuna.getSync("repodata");
if (repodata) {
	mainURL = repodata.link;
	subDir = repodata.source;
}

ipcMain.on('window:settings', (event, arg) => {
  if (settingsWindow == null) createSettingsWindow();
});


class projectStructure{
  constructor(arg){
    this.token = arg.token;
    this.token_valid = false;
    this.validateToken(() => {
      this.perPage = arg.perPage;
      this.groupList = [];
      this.groupObject = [];

      arg.loadPromise();
    });
  }
  validateToken(promise){
    var builtURL = this.buildURL('https://gitlab.com/api/v4/projects', [
      { name: 'private_token', val: this.token}
    ]);

    request({url: builtURL}, (error, response, body) => {
      if (response) {
        if (JSON.parse(response.body).message == '401 Unauthorized') {
          this.token_valid = false;
          authWindow.webContents.send('deliver:error', 'Unauthorized');
        }
        else{
          this.token_valid = true;
          promise();
        }
      }
      else{
        console.log("Error", error);
      }
    });

  }
  buildURL(base, parameters = []){
    return base + '?' + parameters.map(function(elem){
        return elem.name+"="+elem.val;
    }).join("&");
  }
  buildGroupList(page = 1, reload = false){
    var builtURL = this.buildURL('https://gitlab.com/api/v4/groups', [
      { name: 'private_token', val: this.token},
      { name: 'per_page', val: this.perPage},
      { name: 'page', val: page}
    ]);

    request({url: builtURL}, (error, response, body) => {
      if (response) {
        try{
          var obj = JSON.parse(response.body);

          if (obj.length>0) {
            for (var i = 0; i < obj.length; i++) {
              this.groupList.push(obj[i]);
            }

            setTimeout(() =>{
              this.buildGroupList(page+1);
            }, 500);
          }
          else{
            console.log("Group build complete!");
            console.log("Building projects...");

            this.buildGroupProjects(1, 0, reload);
          }

        }
        catch(e){
          console.log(e);
        }
      }
      else{
        console.log("Error", error);
      }
    });
  }
  buildGroupProjects(page = 1, iterator = 0, reload = false){
    if (reload) {
      console.log("reloading");
    }

    if (!this.groupList[iterator]) {
      console.log("no iterator");
      return
    }

    var builtURL = this.buildURL(`https://gitlab.com/api/v4/groups/${this.groupList[iterator].id}/projects`, [
      { name: 'private_token', val: this.token},
      { name: 'per_page', val: this.perPage},
      { name: 'page', val: page}
    ]);

    request({url: builtURL}, (error, response, body) => {
      if (response) {
        try{
          var obj = JSON.parse(response.body);

          if (obj.length>0) {
            this.groupObject.push({
              group: this.groupList[iterator],
              projects: obj
            });

            console.log("Building: ", this.groupList[iterator].full_name);

            //deliver partial data hereeeeeeee

            for (var j = 0; j < obj.length; j++) {
              //console.log("Project: ", this.groupObject[i].projects[j].name);
              if (obj[j] && obj[j].name=="composer") {
                mainWindow.webContents.send('deliver:single', {
                  name: obj[j].name_with_namespace.replace(" / composer", ''),
                  url: obj[j].web_url,
                  repo_id: obj[j].id
                });
                break;
              }
            }

          }

          if (iterator<this.groupList.length-1) {
            setTimeout(() =>{
              this.buildGroupProjects(1, iterator+1, reload);
            }, 500);
          }
          else{
            console.log("Build complete!");

            setsuna.writeData({ 
              data: this.groupObject, 
              force: true, 
              filename: "groups.json"
            }, ({ error }) => {
              if (error) return console.log("ERROR", error);

              this.loadCachedGroupData(reload);
            });  
          }
        }
        catch(e){
          console.log("Caught:", e);
        }
      }
      else{
        console.log("Error", error);
      }
    });
  }
  loadCachedGroupData(reload = false){
    if (!this.token_valid) {
      authWindow.webContents.send('deliver:error', 'Unauthorized');

      if (setsuna.getSync("gl_token")) setsuna.unsetSync("gl_token");
      return;
    }

    setsuna.readData("groups.json", ({ data, error }) => {
      if (error && this.groupObject.length<1) {
        console.log("No cache exists, building file...");
        this.buildGroupList();
      }
      else if (error && this.groupObject.length>1) {
        console.log("error but groupobject", error)
      }
      else{
        if (this.groupObject.length < 1)  this.groupObject = data;

        var composerArray = [];

        for (var i = 0; i < this.groupObject.length; i++) {
          //console.log("Projects: ", this.groupObject[i].projects.length);
          for (var j = 0; j < this.groupObject[i].projects.length; j++) {
            //console.log("Project: ", this.groupObject[i].projects[j].name);
            if (this.groupObject[i].projects[j] && this.groupObject[i].projects[j].name=="composer") {
              composerArray.push({
                name: this.groupObject[i].projects[j].name_with_namespace.replace(" / composer", ''),
                url: this.groupObject[i].projects[j].web_url,
                repo_id: this.groupObject[i].projects[j].id
              });
              break;
            }
          }
        }

        if (mainWindow == null && !reload) {
          createMainWindow();
          authWindow.close();

          mainWindow.webContents.once('dom-ready', () => {
            mainWindow.webContents.send('deliver:array', composerArray);
          });
        }
        else{
          var wCheckInt = setInterval(function(){
            if (mainWindowReady){
              mainWindow.webContents.send('deliver:array', composerArray);
              clearInterval(wCheckInt);
            } 
          }, 500);
        }
      }
    });
  }
  deleteCachedGroupData(){
    this.groupList = [];
    this.groupObject = [];

    setsuna.deleteData("groups.json", ({ error }) => {
      if (error) return console.log("ERROR", error);

      mainWindow.webContents.send('deliver:array', []);
    });
  }
  reloadCachedGroupData(){
    this.buildGroupList(1, true);
  }
  downloadComposer(group_id, promise){
    var builtURL = this.buildURL(`https://gitlab.com/api/v4/projects/${group_id}/repository/files/contr%2Fcomposer%2Ejson`, [
      { name: 'private_token', val: this.token},
      { name: 'ref', val: 'master'}
    ]);

    request({url: builtURL}, (error, response, body) => {
      if (response) {
        promise(JSON.parse(Buffer.from(JSON.parse(response.body).content, 'base64').toString('utf-8')));
      }
      else{
        console.log("Error", error);
      }
    });
  }
}

var loadedComposer;
var project;

function authenticate(arg, wind){
  console.log(tmst() + "Trying to authenticate, checking credentials...");
  if (arg) {
    console.log(tmst() + "Found credentials, creating project structure...");
    project = new projectStructure({
      token: arg,
      perPage: 100,
      loadPromise: () =>{
        console.log(tmst() + "Project structure created");

        if (mainWindow == null) {
          console.log(tmst() + "Closing login window, opening main window...");
          createMainWindow();
          authWindow.close();

          mainWindow.webContents.once('dom-ready', () => {
            console.log(tmst() + "Main window open");
            mainWindowReady = true;
          });
        }

        project.loadCachedGroupData();
      }
    });
  }
  else{
    console.log(tmst() + "Credentials not found, opening login window");
    if (wind == 'authWindow') authWindow.webContents.send('deliver:error', 'No login data saved');
  }
}





//COMPLETE COMMANDS

ipcMain.on('servers:wipe', (event, arg) => {
  console.log(tmst() + "Asking for permission to wipe directory...");
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to clear the directory?'}).then(i => {
    if (i.response==0) {
      console.log(tmst() + "Permission to wipe directory granted");
      console.log(tmst() + "Loading SSH credentials...");

      setsuna.get("ssh_data", ({ data, error }) => {
        if (error) return console.log(tmst() + "Error while reading SSH credentials:", error);

        console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

        ssh.connect({
          host: data.host,
          username: data.user,
          port: data.port,
          password: data.pass,
          tryKeyboard: true,
          onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
          }
        }).then(function(e) {
          console.log(tmst() + "Successfully connected via SSH, executing command...");

          ssh.execCommand(`rm -rf /usr/home/${data.user}/${arg}/*`).then(function(result) {
            if (result.stderr != '') {
              console.log(tmst() + "Error executing command: ", result.stderr);
              //return;
            }

            console.log(tmst() + "Command successfully executed");
            if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);

            console.log(tmst() + "Closing SSH connection...");

            ssh.execCommand('exit').then(function(result) {
              if (result.stderr != '') {
                console.log(tmst() + "Error closing connection: ", result.stderr);
                return;
              }

              console.log(tmst() + "Connection successfully closed");
              if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);
            });
          });
        }).catch(function(e) {
          console.log(tmst() + "Error connecting via SSH: ", e);
        });
      });
    }
    else console.log(tmst() + "Permission to wipe directory declined");
  });
});

ipcMain.on('servers:cache', (event, arg) => {
  console.log(tmst() + "Asking for permission to clear cache...");
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to clear the cache?'}).then(i => {
    if (i.response==0) {
      console.log(tmst() + "Permission to clear cache granted");
      console.log(tmst() + "Loading SSH credentials...");

      setsuna.get("ssh_data", ({ data, error }) => {
        if (error) return console.log(tmst() + "Error while reading SSH credentials:", error);

        console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

        ssh.connect({
          host: data.host,
          username: data.user,
          port: data.port,
          password: data.pass,
          tryKeyboard: true,
          onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
          }
        }).then(function(e) {
          console.log(tmst() + "Successfully connected via SSH, executing command...");

          ssh.execCommand(`rm -rf /usr/home/${data.user}/${arg}/web/assets_update/*`).then(function(result) {
            if (result.stderr != '') {
              console.log(tmst() + "Error executing command: ", result.stderr);
              //return;
            }

            console.log(tmst() + "Command successfully executed");
            if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);

            console.log(tmst() + "Closing SSH connection...");

            ssh.execCommand('exit').then(function(result) {
              if (result.stderr != '') {
                console.log(tmst() + "Error closing connection: ", result.stderr);
                return;
              }

              console.log(tmst() + "Connection successfully closed");
              if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);
            });
          });
        }).catch(function(e) {
          console.log(tmst() + "Error connecting via SSH: ", e);
        });
      });
    }
    else console.log(tmst() + "Permission to clear cache declined");
  });
});

ipcMain.on('servers:request', (event, arg) => {
  console.log(tmst() + "Loading SSH credentials...");

  setsuna.get("ssh_data", ({ data, error }) => {
    if ((error && !error.success) || (!data.host || !data.user || !data.pass)) {
      callNotif({
        "type": 'warning',
        "buttons": ['OK'],
        "message": 'Make sure the SSH configuration is filled out in the settings!'
      });

      return console.log(tmst() + "Error while reading SSH credentials:", error);
    }

    if (!data.port) data.port = 22;

    console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

    ssh.connect({
      host: data.host,
      username: data.user,
      port: data.port,
      password: data.pass,
      tryKeyboard: true,
      onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
        if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
      }
    }).then(function(e) {
      console.log(tmst() + "Successfully connected via SSH, executing command...");

      ssh.execCommand(`ls`).then(function(result) {
        if (result.stderr != '') {
          console.log(tmst() + "Error executing command: ", result.stderr);
          return;
        }

        console.log(tmst() + "Command successfully executed");
        if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);

        if (arg == "mainWindow") {
          console.log(tmst() + "Sending the list of directories to the main window...");
          mainWindow.webContents.send('deliver:directories', result.stdout.split('\n'));
        }
        else if (arg == "uploadWindow") {
          console.log(tmst() + "Sending the list of directories to the upload window...");
          uploadWindow.webContents.send('deliver:directories', result.stdout.split('\n'));
        }

        console.log(tmst() + "Closing SSH connection...");

        ssh.execCommand('exit').then(function(result) {
          if (result.stderr != '') {
            console.log(tmst() + "Error closing connection: ", result.stderr);
            return;
          }

          console.log(tmst() + "Connection successfully closed");
          if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);
        });
      });
    }).catch(function(e) {
      console.log(tmst() + "Error connecting via SSH: ", e);
    });
  });
});

ipcMain.on('databases:request', (event) => {
  console.log(tmst() + "Creating an SSH tunnel...");

  setsuna.get("ssh_data", (ssh_data, ssh_error) => {
    if ((ssh_error && !ssh_error.success) || (!ssh_data.data.host || !ssh_data.data.user || !ssh_data.data.pass)) {
      callNotif({
        "type": 'warning',
        "buttons": ['OK'],
        "message": 'Make sure the SSH configuration is filled out in the settings!'
      });

      return console.log(tmst() + "Error while reading SSH credentials:", ssh_error);
    }

    if (!ssh_data.port) ssh_data.port = 22;

    setsuna.get("db_data", (db_data, db_error) => {
      if ((db_error && !db_error.success) || (!db_data.data.host || !db_data.data.user || !db_data.data.pass)) {
        callNotif({
          "type": 'warning',
          "buttons": ['OK'],
          "message": 'Make sure the database configuration is filled out in the settings!'
        });

        return console.log(tmst() + "Error while reading database credentials:", error);
      }

      var database = tunnel(db_data.data, ssh_data.data);
      
      database.then(function(connobj){
        console.log(tmst() + "SSH tunnel successfully created, querying the database...");

        connobj.connection.query('show databases', function(error, results, fields) {
          if (error) {
            console.log(tmst() + "Error querying the database: ", error);
            return;
          }

          console.log(tmst() + "Received response from the database, parsing results...");

          var deliveredDbs = [];
          for (var i = 0; i < results.length; i++) {
            if (!results[i].Database.startsWith("information_schema")) deliveredDbs.push(results[i].Database);
          }

          deliveredDbs.sort(function(a, b) {
            var firstNumber = a.replace(db_data.data.user + "_test", "").split("_")[0];
            var nextNumber = b.replace(db_data.data.user + "_test", "").split("_")[0];
            return Number(firstNumber) - Number(nextNumber);
          });

          console.log(tmst() + "Databases successfully parsed, returning a list to the main window...");

          mainWindow.webContents.send('deliver:databases', deliveredDbs);

          connobj.connection.end();
          connobj.ssh.end();
        });
      });
    });
  });
});

ipcMain.on('databases:drop', (event, arg) => {
  console.log(tmst() + "Asking for permission to drop a database...");

  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to drop this database?'}).then(i => {
    if (i.response==0) {
      console.log(tmst() + "Permission to drop a database granted");
      console.log(tmst() + "Creating an SSH tunnel...");

      setsuna.get("ssh_data", (ssh_data, ssh_error) => {
        if ((ssh_error && !ssh_error.success) || (!ssh_data.data.host || !ssh_data.data.user || !ssh_data.data.pass)) {
          callNotif({
            "type": 'warning',
            "buttons": ['OK'],
            "message": 'Make sure the SSH configuration is filled out in the settings!'
          });

          return console.log(tmst() + "Error while reading SSH credentials:", ssh_error);
        }

        if (!ssh_data.port) ssh_data.port = 22;

        setsuna.get("db_data", (db_data, db_error) => {
          if ((db_error && !db_error.success) || (!db_data.data.host || !db_data.data.user || !db_data.data.pass)) {
            callNotif({
              "type": 'warning',
              "buttons": ['OK'],
              "message": 'Make sure the database configuration is filled out in the settings!'
            });

            return console.log(tmst() + "Error while reading database credentials:", error);
          }

          var database = tunnel(db_data.data, ssh_data.data);
          
          database.then(function(connobj){
            console.log(tmst() + "SSH tunnel successfully created, querying the database...");

            connobj.connection.query(`DROP DATABASE ${arg};`, function(error, results, fields) {
              if (error) {
                console.log(tmst() + "Error querying the database: ", error);
                return;
              }

              console.log(tmst() + "Received response, database successfully dropped");
              console.log(tmst() + "Preparing to rebuild the database list. Querying...");

              connobj.connection.query('show databases', function(error_i, results, fields) {
                if (error_i) {
                  console.log(tmst() + "Error querying the database: ", error_i);
                  return;
                }

                console.log(tmst() + "Received response from the database, parsing results...");

                var deliveredDbs = [];

                for (var i = 0; i < results.length; i++) deliveredDbs.push(results[i].Database);

                deliveredDbs.sort(function(a, b) {
                  var firstNumber = a.replace(db_data.data.user + "_test", "").split("_")[0];
                  var nextNumber = b.replace(db_data.data.user + "_test", "").split("_")[0];
                  return Number(firstNumber) - Number(nextNumber);
                });

                console.log(tmst() + "Databases successfully parsed, returning a list to the main window...");

                mainWindow.webContents.send('deliver:databases', deliveredDbs);

                connobj.connection.end();
                connobj.ssh.end();
              });
            });
          });
        });
      });
    }
    else console.log(tmst() + "Permission to drop a database declined");
  });
});

ipcMain.on('composer:edit', (event) => { 
  console.log(tmst() + "Checking for loaded composer object...");

  if (loadedComposer) {
    console.log(tmst() + "Loaded composer found, opening the Edit window...");
    createEditWindow(loadedComposer);
  }
  else console.log(tmst() + "Loaded composer not found");
});

ipcMain.on('auth:store', (event, arg) => {
  console.log(tmst() + "Saving the Gitlab token in Sync mode...");
  setsuna.setSync('gl_token', arg);
  console.log(tmst() + "Saving operation complete");
});

var activeProject;

ipcMain.on('composer:get', (event, arg) => { 
  activeProject = arg.alias;
  console.log(tmst() + "Preparing to download chosen composer file...");
  project.downloadComposer(arg.url, function(composer, err){
    console.log(tmst() + "Chosen composer file downloaded, sending object to main window...");
    mainWindow.webContents.send('deliver:composer', composer);
    console.log(tmst() + "Saving composer object locally...");
    loadedComposer = composer;
    console.log(tmst() + "Saving complete");
  });
});

ipcMain.on('composer:update', (event, arg) => { 
  console.log(tmst() + "Updating local composer object with provided data...");
  loadedComposer = JSON.parse(arg);
  console.log(tmst() + "Sending updated object to main window...");
  mainWindow.webContents.send('deliver:composer-update', JSON.parse(arg));
});

ipcMain.on('composer:upload', (event, arg) => { 
  console.log(tmst() + "Updating local composer object with provided data...");
  loadedComposer = arg;
  console.log(tmst() + "Opening upload window...");
  if (loadedComposer) {
    if(uploadWindow == null) createUploadWindow(loadedComposer);
    else uploadWindow.show();
  }
  else{
    callNotif({
      "type": 'warning',
      "buttons": ['OK'],
      "message": 'Make sure to select a composer file first!'
    });
  }
});

ipcMain.on('composer:save', (event) => { 
  console.log(tmst() + "Checking for loaded composer object...");

  if (loadedComposer) {
    console.log(tmst() + "Loaded composer found, opening a save dialog...");

    dialog.showSaveDialog(null, {
        title: 'Save file',
        defaultPath: '~/composer.json'
      }).then((path) => {
        if (path.cancelled || path.filePath == '') {
          console.log(tmst() + "Destination path unavailable, saving cancelled");
          return;
        }

        console.log(tmst() + "Received destination path, writing composer file...");
        
        fs.writeFile(path.filePath, JSON.stringify(loadedComposer, null, 2), 'utf8', function (err) {
          if (err) {
            console.log(tmst() + "Error writing file: ", err);
            return;
          }

          console.log(tmst() + "Successfully wrote the composer file");
        });
    });
  }
  else console.log(tmst() + "Loaded composer not found");
});

ipcMain.on('array:request', (event) => {
  console.log(tmst() + "Received request to load cached group data");
  project.loadCachedGroupData();
});

ipcMain.on('auth:signin', (event, arg) => {
  console.log(tmst() + "Received request to authenticate");

  if (!arg.data) authenticate(setsuna.getSync('gl_token'), arg.window);
  else authenticate(arg.data);
});

ipcMain.on('composer:upload-to-server', (event, arg) => {
  console.log(tmst() + "Preparing to upload files to a server..."); 

  console.log(tmst() + "Saving loaded composer to a temporary file...");

  loadedComposer = arg.newComposer;
  setsuna.writeData({ 
    data: loadedComposer,
    spacing: 2,
    force: true, 
    filename: "composer.json"
  }, ({ cmp_error }) => {
    if (cmp_error) {
      return console.log(tmst() + "Error writing temporary composer file: ", cmp_error);
    }
    console.log(tmst() + "Loading SSH credentials...");

    setsuna.get("ssh_data", ({ data, error }) => {
      if (error) return console.log(tmst() + "Error while reading SSH credentials:", error);

      console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

      ssh.connect({
        host: data.host,
        username: data.user,
        port: data.port,
        password: data.pass,
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
        }
      }).then(function(e) {
        console.log(tmst() + "Successfully connected via SSH");

        function putComposer(){
          console.log(tmst() + "Uploading the composer file to a remote server...");

          ssh.putFiles([{ local: path.join(setsuna.home_dir, 'composer.json'), remote: `/usr/home/${data.user}/${arg.dir}/composer.json` }]).then(function() {
            console.log(tmst() + "Upload successful. Closing upload and configuration windows...");

            if(configWindow != null) configWindow.close();
            if(uploadWindow != null) uploadWindow.close();

            console.log(tmst() + "Closing SSH connection...");

            ssh.execCommand('exit').then(function(result) {
              if (result.stderr != '') {
                console.log(tmst() + "Error closing connection: ", result.stderr);
                return;
              }

              console.log(tmst() + "Connection successfully closed");
              if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);
            });
          }, function(s_error) {
            console.log(tmst() + "Error closing connection: ", s_error);
          });
        }

        function putDBFile(data_db, callback){
          console.log(tmst() + "Uploading the database file to a remote server...");
          console.log(tmst() + "Writing a temporary database configuration file...");
          setsuna.writeData({ 
            data: data_db, 
            force: true,
            spacing: 2,
            filename: "config.json"
          }, (d_err) => {
            if (d_err && !d_err.success) return console.log(tmst() + "Error writing a temporary database configuration file: ", d_err);
            console.log(tmst() + "Successfully wrote the database configuratoin file");
            console.log(tmst() + "Uploading the database configuration file to a remote server...");
            ssh.putFiles([{ local: path.join(setsuna.home_dir, 'config.json'), remote: `/usr/home/${data.user}/${arg.dir}/install/config.json` }]).then(function() {
              console.log(tmst() + "Database configuration file successfully uploaded");
              if(callback) callback();
            }, function(d_error) {
              console.log(tmst() + "Error uploading the temporary database configuration file: ", d_error);
            });

          });
        }

        function wipeDirectory(callback){
          console.log(tmst() + "Executing wipe command...");
          ssh.execCommand(`rm -rf /usr/home/${data.user}/${arg.dir}/*`).then(function(result) {
            if (result.stderr != '') {
              console.log(tmst() + "Error executing command: ", result.stderr);
              //return;
            }

            console.log(tmst() + "Command successfully executed");
            if (result.stdout != '') console.log(tmst() + "Received response from the command: ", result.stdout);

            if (callback) callback();
          });
        }

        function putAuth(callback){
          console.log(tmst() + "Generating auth file...");

          console.log(tmst() + "Getting saved Gitlab credentials...");
          setsuna.get("gl_auth", (gl_data, gl_error) => {
            if (gl_error) return console.log(tmst() + "Error getting Gitlab credentials: ", gl_error);

            console.log(tmst() + "Successfully got Gitlab credentials");
            console.log(tmst() + "Getting saved SVN credentials...");
            setsuna.get("svn_auth", (svn_data, svn_error) => {
              if (svn_error) return console.log(tmst() + "Error getting SVN credentials: ", svn_error);

              console.log(tmst() + "Successfully got SVN credentials");

              var newJson = {
                "http-basic": {
                    "gitlab.com": {
                        "username": gl_data.data.user,
                        "password": gl_data.data.pass
                    },
                    "svn.ukrtech.info": {
                        "username": svn_data.data.user,
                        "password": svn_data.data.pass
                    }
                }
              };

              setsuna.writeData({ 
                data: newJson, 
                force: true, 
                spacing: 2,
                filename: "auth.json"
              }, (aw_error) => {
                if (aw_error && !aw_error.success) return console.log(tmst() + "Error writing temporary auth file: ", aw_error);

                console.log(tmst() + "Successfully generated temporary auth file, uploading...");

                ssh.putFiles([{ local: path.join(setsuna.home_dir, 'auth.json'), remote: `/usr/home/${data.user}/${arg.dir}/auth.json` }]).then(function() {
                  console.log(tmst() + "Successfully uploaded temporary auth file");

                  if(callback) callback();
                }).catch(function(up_err){
                  if (up_err) return console.log(tmst() + "Error uploading temporary auth file: ", up_err);
                });
              });
            });
          });
        }

        if (arg.wipe) {
          function actionSet(acceptwipe){
            if (arg.db) {
              console.log(tmst() + "Requested to configure project data");

              if (configWindow == null) {
                console.log(tmst() + "Configuration window unavailable, creating...");

                console.log(tmst() + "Requesting database credentials...");
                setsuna.get("db_data", (db_data, db_error) => {
                  if (db_error) return console.log(tmst() + "Error getting database credentials: ", db_error);

                  createConfigWindow({
                    auth: arg.auth,
                    dir: arg.dir,
                    db: {
                      user: db_data.data.user,
                      pass: db_data.data.pass
                    },
                    php: db_data.data.path,
                    ssh: data.user,
                    host: db_data.data.host,
                    alias: activeProject
                  });

                  ipcMain.on('config:upload', (event, up_arg) => { 
                    if (acceptwipe) {
                      wipeDirectory(function(){
                        if (up_arg.auth){
                          putDBFile(up_arg, function(){
                            putAuth(putComposer);
                          });
                        }
                        else{
                          putDBFile(up_arg, putComposer)
                        }
                      });
                    }
                    else{
                      if (up_arg.auth){
                        putDBFile(up_arg, function(){
                          putAuth(putComposer);
                        });
                      }
                      else{
                        putDBFile(up_arg, putComposer)
                      }
                    }
                  });
                });
              }
              else{
                console.log(tmst() + "Configuration window exists, bringing to the front...");

                configWindow.show();
              }
            }
            else{
              console.log(tmst() + "Skipping configuring project data");
              if (arg.auth){
                console.log(tmst() + "Generating authentication file...");
                
                if (acceptwipe) {
                  wipeDirectory(function(){
                    putAuth(putComposer);
                  });
                }
                else putAuth(putComposer);
              }
              else{
                console.log(tmst() + "Skipping generating authentication file...");

                if (acceptwipe) {
                  wipeDirectory(function(){
                    putComposer();
                  });
                }
                else putComposer();
                
              }
            }
          }

          console.log(tmst() + "Wipe requested, asking for permission to wipe the directory...");

          dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to clear the directory?'}).then(i => {
            if (i.response==0) {
              console.log(tmst() + "Permission to wipe directory granted");
              actionSet(true);
            }
            else {
              console.log(tmst() + "Permission to wipe directory declined");
              actionSet(false);
            }
          });
        }
        else{
          console.log(tmst() + "No wipe requested");

          if (arg.db) {
            console.log(tmst() + "Requested to configure project data");

            if (configWindow == null) {
              console.log(tmst() + "Configuration window unavailable, creating...");

              console.log(tmst() + "Requesting database credentials...");

              setsuna.get("db_data", (db_data, db_error) => {
                if (db_error) return console.log(tmst() + "Error getting database credentials: ", db_error);

                createConfigWindow({
                  auth: arg.auth,
                  dir: arg.dir,
                  db: {
                    user: db_data.data.user,
                    pass: db_data.data.pass
                  },
                  php: db_data.data.path,
                  ssh: data.user,
                  host: db_data.data.host,
                  alias: activeProject
                });

                ipcMain.on('config:upload', (event, up_arg) => { 
                  if (up_arg.auth){
                    putDBFile(up_arg, function(){
                      putAuth(putComposer);
                    });
                  }
                  else{
                    putDBFile(up_arg, putComposer)
                  }
                });
              });
            }
            else{
              console.log(tmst() + "Configuration window exists, bringing to the front...");

              configWindow.show();
            }
          }
          else{
            console.log(tmst() + "Skipping configuring project data");

            if (arg.auth){
              console.log(tmst() + "Generating authentication file...");

              putAuth(putComposer);
            }
            else{
              console.log(tmst() + "Skipping generating authentication file...");

              putComposer();
            }
          }
        }
      }).catch(function(e) {
        console.log(tmst() + "Error connecting via SSH: ", e);
      });
    });
  });
});

ipcMain.on('servers:install', (event, arg) => { 
  console.log(tmst() + "Asking for permission to install project...");
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to install this project?'}).then(i => {
    if (i.response==0) {
      console.log(tmst() + "Permission to install project granted");
      console.log(tmst() + "Loading SSH credentials...");

      setsuna.get("ssh_data", ({ data, error }) => {
        if (error) return console.log(tmst() + "Error while reading SSH credentials:", error);

        console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

        ssh.connect({
          host: data.host,
          username: data.user,
          port: data.port,
          password: data.pass,
          tryKeyboard: true,
          onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
          }
        }).then(function(e) {
          console.log(tmst() + "Successfully connected via SSH, executing command...");

          ssh.exec(`composer create-project -d /usr/home/${data.user}/${arg}/`, [], {
            onStdout(chunk) {
              console.log(tmst() + "Received stream chunk: ", chunk.toString('utf8'));
              if (consoleWindow == null) createConsoleWindow();
              else consoleWindow.showInactive();
              consoleWindow.webContents.send('deliver:log', chunk.toString('utf8'));
            },
            onStderr(chunk) {
              console.log(tmst() + "Error ecountered in stream chunk: ", chunk.toString('utf8'));
              if (consoleWindow == null) createConsoleWindow();
              else consoleWindow.showInactive();
              consoleWindow.webContents.send('deliver:log', chunk.toString('utf8'));
            }
          }).then(function(e){
            console.log("PROBABLY COMPLETE??");
          }).then(function(e){
            console.log("CAUGHT ERROR??", e);
          });

        }).catch(function(e) {
          console.log(tmst() + "Error connecting via SSH: ", e);
        });
      });
    }
    else console.log(tmst() + "Permission to install project declined");
  });
});

ipcMain.on('servers:project', (event, arg) => { 
  console.log(tmst() + "Asking for permission to install child project...");
  dialog.showMessageBox({type: 'info', buttons: ['OK', 'Cancel'], message: 'Are you sure you want to install a child project?'}).then(i => {
    if (i.response==0) {
      console.log(tmst() + "Permission to install child project granted");
      console.log(tmst() + "Loading SSH credentials...");

      setsuna.get("ssh_data", ({ data, error }) => {
        if (error) return console.log(tmst() + "Error while reading SSH credentials:", error);

        console.log(tmst() + "SSH credentials loaded, connecting via SSH...");

        ssh.connect({
          host: data.host,
          username: data.user,
          port: data.port,
          password: data.pass,
          tryKeyboard: true,
          onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) finish([data.pass])
          }
        }).then(function(e) {
          console.log(tmst() + "Successfully connected via SSH, executing command...");

          ssh.exec(`php /usr/home/${data.user}/${arg}/vendor_update/uti/cms/yiic.php CreateProject FastCreate -pa=uticms`, [], {
            onStdout(chunk) {
              console.log(tmst() + "Received stream chunk: ", chunk.toString('utf8'));
              if (consoleWindow == null) createConsoleWindow();
              else consoleWindow.showInactive();
              consoleWindow.webContents.send('deliver:log', chunk.toString('utf8'));
            },
            onStderr(chunk) {
              console.log(tmst() + "Error ecountered in stream chunk: ", chunk.toString('utf8'));
              if (consoleWindow == null) createConsoleWindow();
              else consoleWindow.showInactive();
              consoleWindow.webContents.send('deliver:log', chunk.toString('utf8'));
            }
          }).then(function(e){
            console.log("PROBABLY COMPLETE??");
          }).then(function(e){
            console.log("CAUGHT ERROR??", e);
          });

        }).catch(function(e) {
          console.log(tmst() + "Error connecting via SSH: ", e);
        });
      });
    }
    else console.log(tmst() + "Permission to install child project declined");
  });
});

//COMPLETE COMMANDS END

//SEMI COMPLETE COMMANDS

function callNotif(arg){
  dialog.showMessageBox(arg).then(i => {
    if (arg.callback) arg.callback(i);
  });
}

ipcMain.on('dialog', (event, arg) => { 
  callNotif(arg);
});

//SEMI COMPLETE COMMANDS END







