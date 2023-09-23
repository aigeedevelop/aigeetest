'use strict'

var http = require('http');
var https = require('https');
var qs = require('querystring');
const request = require('request');

String.prototype.format = function(args) {
	var result = this;
	if (arguments.length > 0) {
		if (arguments.length == 1 && typeof (args) == "object") {
			for (var key in args) {
				if(args[key]!=undefined){
					var reg = new RegExp("({" + key + "})", "g");
					result = result.replace(reg, args[key]);
				}
			}
		}
		else {
			for (var i = 0; i < arguments.length; i++) {
				if (arguments[i] != undefined) {
					//var reg = new RegExp("({[" + i + "]})", "g");
					var reg = new RegExp("({)" + i + "(})", "g");
					result = result.replace(reg, arguments[i]);
				}
			}
		}
	}
	return result;
};

exports.post = function (host,port,path,data,callback) {
	
	var content = qs.stringify(data);  
	var options = {  
		hostname: host,  
		port: port,  
		path: path + '?' + content,  
		method:'GET'
	};  
	  
	var req = http.request(options, function (res) {  
		//console.log('STATUS: ' + res.statusCode);  
		//console.log('HEADERS: ' + JSON.stringify(res.headers));  
		res.setEncoding('utf8');  
		res.on('data', function (chunk) {  
			//console.log('BODY: ' + chunk);
			callback(chunk);
		});  
	});
	  
	req.on('error', function (e) {  
		console.log('problem with request: ' + e.message);  
	});  
	  
	req.end(); 
};

exports.get2 = function (url,data,callback,safe) {
	var content = qs.stringify(data);
	var url = url + '?' + content;
	var proto = http;
	if(safe){
		proto = https;
	}
	var req = proto.get(url, function (res) {  
		//console.log('STATUS: ' + res.statusCode);  
		//console.log('HEADERS: ' + JSON.stringify(res.headers));  
		res.setEncoding('utf8');  
		res.on('data', function (chunk) {  
			//console.log('BODY: ' + chunk);
			var json = JSON.parse(chunk);
			callback(true,json);
		});  
	});
	  
	req.on('error', function (e) {  
		console.log('problem with request: ' + e.message);
		callback(false,e);
	});  
	  
	req.end(); 
};

exports.get = function (host,port,path,data,callback,safe) {
	var content = qs.stringify(data);  
	var options = {  
		hostname: host,  
		path: path + '?' + content,  
		method:'GET'
	};
	if(port){
		options.port = port;
	}
	var proto = http;
	if(safe){
		proto = https;
	}
	var req = proto.request(options, function (res) {  
		//console.log('STATUS: ' + res.statusCode);  
		//console.log('HEADERS: ' + JSON.stringify(res.headers));  
		res.setEncoding('utf8');  
		res.on('data', function (chunk) {  
			//console.log('BODY: ' + chunk);
			var json = JSON.parse(chunk);
			callback(true,json);
		});  
	});
	  
	req.on('error', function (e) {  
		//console.log('problem with request: ' + e.message);
		callback(false,e);
	});  
	  
	req.end(); 
};

exports.send = function(res,data){
	if(data == null){
		res.send(false); return;
	}
	var jsonstr = JSON.stringify(data);
	res.send(jsonstr);
};
exports.send2 = function(res,data){
	if(data == null){
		res.send(false); return;
	}
	res.send(data);
};
// integration LOGIN
exports.sendRequestLogin = function(url, data, callback){
	callback = callback == null? nop:callback;	

	var expires = new Date().getTime() + (60 * 1000); // 1 min in the future
	var postBody = JSON.stringify(data);
	
	var headers = {
		'Content-Type' : 'application/json',
		// 'Accept': '*/*',
		// 'cache-control': 'no-cache',
		// 'connection': 'keep-alive',
		// 'accept-encoding': 'gzip, deflate, br',
		// 'Accept': 'application/json',
		// 'X-Requested-With': 'XMLHttpRequest',
	};
	var requestOptions = {
		headers: headers,
		url: url, 
		method: 'POST', 
		body: postBody,
	};

	request(requestOptions, function(error, response, bodyData) {
		// console.log('response', response.headers)
	  	if (error) { 
	  		console.log('request login:' + error); 
			callback(null);
			return;
	  	}
	  	callback(bodyData);
	  	if(bodyData) {
	  		// console.log(bodyData)
		 }
		 else {
		 	callback(null);
		 }
	});    
};