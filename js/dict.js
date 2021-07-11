const Setsuna = require("setsuna");
var setsuna = new Setsuna({
  dirname: '.utpm_v2'
});

window.dict = require(`../locale/en.json`);

setsuna.initSync();

var locale = setsuna.getSync("locale") || 'en';
console.log(locale)
window.dict = require(`../locale/${locale}.json`);

//async version
/*
setsuna.init(error => {
    if (error && !error.success) return console.log("ERROR", error);

    setsuna.get("locale", ({ data, error }) => {
	    if (error) {
	    	setsuna.set("locale", "en", ({ error }) => {
			    if (error && !error.success) return console.log("ERROR", error);
			});
	    	//return console.log("ERROR", error);
	    }
	    else{
	    	if (data == 'en') return;

	    	window.dict = require(`../locale/${data}.json`);
	    }
	});
});
*/