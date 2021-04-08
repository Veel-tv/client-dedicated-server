var fs = require('fs');
var WebTorrent = require('webtorrent');
var client = new WebTorrent();

if ( typeof nw != 'undefined') { //Using Nw.js rather than direct Node.js
  var win = nw.Window.get();
  win.showDevTools();
}
var total_veels = 0;
var myId = "";
var storageSpaceToUse = 50000; //Default in MB (50GB)
var seedInfo = [];
var pjson = require('./package.json');
process.setMaxListeners(0);
var request = require('request');
var http = require('http');
var storageLocation = process.cwd()+"/Veels";
//storageLocation = "/media/extern/Elements SE/Veel";
console.log("pjson: ",pjson);
username = "anesu";
var dir_test = storageLocation;
var generateTorrentFile = true;

console.log("dir_test: ",dir_test);
if (!fs.existsSync(storageLocation)) {
	console.log("does not exist");
      fs.mkdirSync(storageLocation);
}


client.on('error', function (err) { console.log("an error occured: ",err); }); //For debugging for now. FIXME: Handle this for users
  
/**
 * Loads the downloaded Veel data. This is for already downloaded Veels
 *
 * @param {String} Location where the veel files are located.
 * @param {String} Torrent name.
 * @return null.
 */
function reinitVeel(veelLocation,torrentName) {
	client.seed(
    veelLocation,
    torrent => {
      torrent.addWebSeed('https://ws-au.veel.tv/ws/');
      torrent.addWebSeed('https://veel.tv/ws/');
      console.log('started');
      if (generateTorrentFile) {
        if (!fs.existsSync(torrentName+'.torrent')) {
          fs.writeFileSync(torrentName+'.torrent', torrent.torrentFile);
        }
      }
      
      initSeedDownload();
      
      torrent.on('error', function (err) {
        console.log(err);
      });
    },
  );
}

var lastSeedPos = -1;

/**
 * Loads the next downloaded Veel Torrent. It will call the re-Init function to broadcast the Veel. This is for already downloaded Veels
 *
 * @return null.
 */
function initSeedDownload() {
	lastSeedPos++;
	console.log("seedInfo.length: ",lastSeedPos);
	if (lastSeedPos < total_veels) {
		reinitVeel(storageLocation+"/"+seedInfo[lastSeedPos].id,seedInfo[lastSeedPos].id);
	} else {
		console.log("done launching seeds");
	}
}

/**
 * Downloads all veels provided/assigned by the Veel server
 *
 * @return null.
 */
function downloadAllVeels() {
	lastSeedPos++;
  if (lastSeedPos == seedInfo.length) {
    pjson.storageLocations[0].completed = true;
    var json = JSON.stringify(pjson);
    fs.writeFile('./package.json', json, 'utf8', function () {
      console.log("saved final json");
    });
  }
	downloadVeel(seedInfo[lastSeedPos].magnet+"&ws=https://ws-au.veel.tv/ws/&ws=https://veel.tv/ws/",storageLocation);
}



//Init everything here
if (pjson.storageLocations.length != 0) { //Already started or finished downloading Veels
	seedInfo = pjson.storageLocations[0].veels;
	total_veels = Object.keys(seedInfo).length-2;
  if (pjson.storageLocations[0].completed) { //Finished downloading all Veels
    
    initSeedDownload();
	console.log("seeding veels");
  } else { //Didn't finish downloading everything so let's try to continue where we left off
	console.log("downloading all veels");
    downloadAllVeels();
  }
	
} else { //Let's request Veels to seed from the Veel servers
  const data = {
    space: storageSpaceToUse,
    user: username
  }

var querystring = require("querystring");
var qs = querystring.stringify(data);
var qslength = qs.length;
var options = {
    hostname: "veel.pe.hu",
    port: 80,
    path: "/clients/new-client/index.php",
    method: 'POST',
    headers:{
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': qslength
    }
};

var buffer = "";
var req = http.request(options, function(res) {
    res.on('data', function (chunk) {
       buffer+=chunk;
    });
    res.on('end', function() {
        //console.log(buffer);
        seedInfo = JSON.parse(buffer);
        //console.log("seedInfor: ",seedInfo);
        if (pjson.storageLocations != null) {
            pjson.storageLocations.push({
              completed: false,
              "path": storageLocation,
              "usableStorage":storageSpaceToUse,
              "veels" : seedInfo
            });
            pjson.veeler_id = seedInfo.client_id;
            var json = JSON.stringify(pjson);
            fs.writeFile('./package.json', json, 'utf8', function () {
              console.log("saved json");
              downloadAllVeels(); //initSeedDownload();
            });
	//console.log("pjson mod: ",pjson);
          
        }
    });
});

req.write(qs);
req.end();
}



/**
 * Downloads the given Veel into the given destination
 *
 * @param {String} Magnet URI.
 * @param {String} Destination to save the Veel data to.
 * @return null.
 */
function downloadVeel(magnetURI,destination) {
  client.add(magnetURI, { path: destination }, function (torrent) {
	console.log("loaded 2: ",torrent.files[0].path);
	//initSeedDownload();
    torrent.on('done', function () {
      console.log('torrent download finished');
	downloadAllVeels();
    })
  });
}




  
