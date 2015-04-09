//  (C) COPYRIGHT INTERNATIONAL BUSINESS MACHINES CORPORATION 2006-2010
//                       ALL RIGHTS RESERVED
//        IBM Research Division, Zurich Research Laboratory
// --------------------------------------------------------------------










/**
 * GPS related helper functions.
 * @class
 * @static
 */
var GPS = {};

/**
 * lat/lon in fractional degrees.
 * @param point Object with lat, lon, ele
 * @param res   Result object with x,y and z or null
 * @return {Object} Result object
 */
GPS.WGS84_to_CH1903 = function(/** Object */point, /** Object */res) {
    // convert to fractional secs 
    var latsecs = point.lat*3600;
    var lonsecs = point.lon*3600;
    // Move origin to Bern
    var latBern1 = (latsecs - 169028.66)/10000;
    var lonBern1 = (lonsecs -  26782.50)/10000;
    var lonBern2 = Math.pow(lonBern1,2);
    var lonBern3 = Math.pow(lonBern1,3);
    var latBern2 = Math.pow(latBern1,2);
    var latBern3 = Math.pow(latBern1,3);

    var y = (600072.37 
	     + 211455.93 * lonBern1 
	     -  10938.51 * lonBern1 * latBern1
	     -      0.36 * lonBern1 * latBern2
	     -     44.54 * lonBern3);
   
    var x = (200147.07
	     + 308807.95            * latBern1 
	     +   3745.25 * lonBern2
	     +     76.63            * latBern2
	     -    194.56 * lonBern2 * latBern1
	     +    119.79            * latBern3);
	     
    var h = (point.ele - 49.55 
	     +      2.73 * lonBern1
	     +      6.94            * latBern1);
    if( res == null )
	res = {};
    // Convert from m (swiss grid) to cm (simulation)
    res.y = Math.round(y*100);
    res.x = Math.round(x*100);
    res.z = Math.round(h*100);
    return res;
};

/**
 * lat/lon in fractional degrees
 * @param point  Object with x,y and z
 * @param res     Result object with lat, lon, ele or null
 * @returns {Object} Result object
 */
GPS.CH1903_to_WGS84 = function(/** Object */point, /** Object */res) {
    // Convert from cm (simulation) to m (swiss grid)
    var x = point.x/100;
    var y = point.y/100;
    var h = point.z/100;
    
    var x1 = (x-200000)/1000000;
    var y1 = (y-600000)/1000000;
    var x2 = Math.pow(x1,2);
    var x3 = Math.pow(x1,3);
    var y2 = Math.pow(y1,2);
    var y3 = Math.pow(y1,3);

    var lon = (2.6779094
	       + 4.728982 * y1
	       + 0.791484 * y1 * x1
	       + 0.1306   * y1 * x2
	       - 0.0436   * y3       );

    var lat = (16.9023892
	       + 3.238272      * x1
	       - 0.270978 * y2
	       - 0.002528      * x2
	       - 0.0447   * y2 * x1
	       - 0.0140        * x3   );
    var ele = (h + 49.55
	       - 12.60 * y1
	       - 22.64      * x1);
    if( res == null )
	res = {};
    res.lat = lat*100/36;
    res.lon = lon*100/36;
    res.ele = ele;
    return res;
};

/**
 * Default static functions to convert to/from wgs84to simulation coordinates
 * Apps should overwrite depending on context.
 */
GPS.wgs84_to_xyz = GPS.WGS84_to_CH1903;
/**
 * Default static functions to convert to/from wgs84to simulation coordinates
 * Apps should overwrite depending on context.
 */
GPS.xyz_to_wgs84 = GPS.CH1903_to_WGS84;


/**
 * Return feed for simulation.
 * @param gpxfile    Filename 
 * @param timestep  Default 1000ms
 * @param trailer   'freeze' or 'loop'
 * @returns {Object[]} Array with positional data to feed into simulation
 */
GPS.gpx2feed = function(/** String */gpxfile, /** Number */timestep, /** String */trailer) {
    if( !timestep )
	timestep = 1000; // ms => 1sec

    var data = OSFile.readFully(gpxfile);
    data = data.replace(/\r?\n/g," ");

    var trkrex = new RegExp("<trkpt(.*?)</trkpt>", "g");
    var latrex = new RegExp('lat="([0-9.]+)"');
    var lonrex = new RegExp('lon="([0-9.]+)"');
    var elerex = new RegExp('<ele>([0-9.]+)');
    var timrex = new RegExp('<time>([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})Z');
    
    var feed = [];
    var lastmillis = null;
    while( (match = trkrex.exec(data)) ) {
	var pt = match[1];
	var mlat = latrex.exec(pt);
	var mlon = lonrex.exec(pt);
	var mele = elerex.exec(pt);
	var mtim = timrex.exec(pt);
	if( mlat && mlon && mele ) {
	    var point = {
		lat: (new Number(mlat[1])).valueOf(),
		lon: (new Number(mlon[1])).valueOf(),
		ele: (new Number(mele[1])).valueOf()
	    };
	    var msforward = timestep;
	    if( mtim ) {
		var millis = Date.UTC(mtim[1],mtim[2]+1,mtim[3],mtim[4],mtim[5],mtim[6]);
		if( lastmillis == null ) {
		    msforward = 0;
		} else {
		    if( millis <= lastmillis )
			continue;  // ignore track points being to dense
		    msforward = millis-lastmillis;
		}
		lastmillis = millis;
	    }
	    GPS.wgs84_to_xyz(point, point); // augment point with x/y/z
	    feed.push(msforward);
	    feed.push(point);
	}
    }
    if( trailer != null )  // e.g. "freeze" or "loop"
	feed.push(trailer);
    return feed;
};

/**
 * Obtain a point from a track.
 * @param gpxfile   Filename
 * @param offset  0..1.0 where on the track to take a point
 * @returns {Object} point
 */
GPS.gpx2point = function (/** String */gpxfile, /** Number */offset) {
    var feed = GPS.gpx2feed(gpxfile, 1000);
    if( feed && feed.length > 0 ) {
	var idx = (feed.length * offset) & ~1;
	if( !idx || idx < 0 )
	    idx = 0;
	else if( idx >= feed.length )
	    idx = feed.length-2;
	return feed[idx+1];
    }
    throw "No points in "+gpxfile;
};

/**
 * @param point
 * @returns {String}
*/
GPS.point2opt = function(/** Object */point) {
    return sprintf("--pos=%d,%d,%d", point.x, point.y, point.z);
};


/**
 * Extract all places from a KML file.
 * @param kmlfile Filename
 * @returns {Array} Places with objects with lat, lon and ele
 */
GPS.kml2places = function (/** String */kmlfile) {
    var plcrex = new RegExp("<Placemark>(.*?)</Placemark>", "g");
    var poirex = new RegExp("<Point>(.*?)</Point>");
    var coorex = new RegExp("<coordinates>(.*?)</coordinates>");
    var namrex = new RegExp("<name>(.*?)</name>");

    var places = [];
    var data = OSFile.readFully(kmlfile);
    data = data.replace(/\r?\n/g," ");
    var match;
    while( (match = plcrex.exec(data)) ) {
	var m, s = match[1];
	if( !(m = namrex.exec(s)) )
	    continue;
	var place = { name: m[1] };
	if( !(m = poirex.exec(s)) || !(m = coorex.exec(m[1])) )
	    continue;
	var a = m[1].split(/,/);
	place.lon = new Number(a[0]).valueOf();
	place.lat = new Number(a[1]).valueOf();
	place.ele = new Number(a[2]).valueOf();
	GPS.wgs84_to_xyz(place, place); // augment point with x/y/z
	if( place.ele == 0 )
	    place.z = 0;
	places.push(place);
    }
    return places;
};



/**
 * Find a specific point/place in the given KML file.
 * @param kmlfile
 * @param namespace
 * @returns {Object} place
*/
GPS.kml2point = function (/** String */kmlfile, /** String|RegExp */namespec) {
    var places = GPS.kml2plaes(kmlfile);
    for( var i=0; i<places.length; i++ ) {
	if( namespec instanceof RegExp ) {
	    if( namespec.test(places[i].name) )
		return places[i];
	} else {
	    if( places[i].name == namespec )
		return places[i];
	}
    }
    throw "No such place in: "+kmlfile;
};






 /**
  * Uses http://api.hostip.info to retrieve ip address and geo information.
  * Returns object with properties lat, lng, ip, city, country_code and
  * ccountry_name
  * @returns {Object}
  */
GPS.getInfo = function() {
    var hostname = "api.hostip.info";
    var cl = new HTTP.Client();
    cl.setTimeout(10000);
    cl.open(hostname, 80, BLCK);
    var uri = "/get_json.php?position=true";
    var resp = cl.request(uri, null, null, null, null, BLCK);
    var body = resp.getBody();
    var geo = JSON.parse(body);
    //println(Util.formatData(geo));
    if (!geo.ip) {
	throw new Exception("Could not get ip address");
    }
    if (!geo.lat || !geo.lng) {
	throw new Exception("Could not get latitude/longitude");
    }
    return geo;
};



