'use strict';

const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const async = require("async");
const router = express.Router();
const request = require('request');
const Crawler = require('crawler');
const ejs = require('ejs');
const Feed = require('feed').Feed;

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var handlebars = require('handlebars');

const db 	 = require('../utils/db');
const crypto = require('../utils/crypto');
const http 	 = require('../utils/http');
const fcm 	 = require('../utils/fcm');
const common = require('./common');
const configs = require("../configs");
const {mailConfig, vimeoConfig} = require("../configs");
const config = configs.app_server();
// 
const Vimeo = require('vimeo').Vimeo;
const vimeo_client = new Vimeo(vimeoConfig.CLIENT_ID, vimeoConfig.CLIENT_SECRET, vimeoConfig.ACCESS_TOKEN);

/****************** Common ***************************/
	router.get('/test', async (req, res) => {
		// console.log('metadata', )
		const token = 'clz91D32TPW0d2h3i-b0Er:APA91bGqGtKqa2ri0FI7d5oVbH59G_9JGkiAnYOAFyv9PXmVEZXOBpCfIH_SwBNouQKFbUekYG-HARJ8rnEOlpEyMQcnWJUrs3aCEn7N29rLeOcC34QThH_mUDuZSYGc91Y5RgHNdU-V';
		fcm.sendMessage(token, 'push text', 'test', {})
		http.send(res, 'sendData');	
	});
	router.post('/rss', async (req, res) => {
		
		const feed = new Feed({
			title: "Feed Title",
			description: "This is my personal feed!",
			id: "http://example.com/",
			link: "http://example.com/",
			language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
			image: "http://example.com/image.png",
			favicon: "http://example.com/favicon.ico",
			copyright: "All rights reserved 2013, John Doe",
			updated: new Date(2013, 6, 14), // optional, default = today
			generator: "awesome", // optional, default = 'Feed for Node.js'
			feedLinks: {
				json: "https://example.com/json",
				atom: "https://example.com/atom"
			},
				author: {
				name: "John Doe",
				email: "johndoe@example.com",
				link: "https://example.com/johndoe"
			}
		});
		
		res.setHeader("Content-Type", "text/xml");
		res.write(feed.rss2());
		res.end();
	});
	router.post('/test', function(req, res){
		formParse(req, (fields, files) => {
			console.log('fields', fields);
			http.send(res, true);
	
		});	
	});
	// const formParse = function (req, callback) {
	// 	try {
	// 		var form = new formidable.IncomingForm();
	// 		form.multiples = true;
	// 		form.parse(req, function (err, fields, files) {
	// 			callback(fields, files);
	// 		});	
	// 		form.on('error', function(err) {
	// 			// console.log(`formParse: ${req.url}, ${err}`);
	// 		});
	// 	} catch (error) {
	// 		console.log(`http_service.js formParse error: ${req.url}, ${error}`);
	// 	}
	// }
	const formParse = function (req, callback) {
		try {
			// var form = new formidable.IncomingForm();
			let maxFileSize = 10 * 1024 * 1024 * 1024;	// 10GB
			var form = formidable({maxFileSize, multiples: true});
			// form.multiples = true;
			form.parse(req, function (err, fields, files) {
				callback(fields, files);
			});	
			form.on('error', function(err) {
				console.log(`formParse: ${req.url}, ${err}`);
			});
		} catch (error) {
			console.log(`http_service.js formParse error: ${req.url}, ${error}`);
		}
	}

	const getAuthToken = function (){
		Date.prototype.addDays = function(days) {
			var date = new Date(this.valueOf());
			date.setDate(date.getDate() + days);
			return date;
		}

		var date = new Date();
		return date.addDays(1).getTime();		// add a day

	}
	
/********************auth*******************/

    router.post('/login', function(req, res){		// check login
	    formParse(req, (fields, files) => {

			var auth_token = getAuthToken();
			if(!fields.email) {
				http.send(res, -1); return;
			}
			// 
			const {password, fcmToken} = fields;
			
			db.checkUserEmail(fields, async (result) =>
			{
	            if(result) {        // user already exist
					if(result.status == 'E') {	// 탈퇴회원
						http.send(res, -10); return;
					}
					// 
					let checkPass = await crypto.compareBcryptHash(password, result.password);
					let encStr = await crypto.getBcryptHash(password);
					// console.log('encStr', password, encStr)
					if(checkPass) {
						let userId = result.id;
						var sendData = {
							auth_token: auth_token,
							id: 		userId,
							email: 		result.email,
							profile: 	result.profile,
							nickname: 	result.nickname
						}
						if(Boolean(fcmToken) && fcmToken != 'undefined' && fcmToken != 'null') {
							db.updateByField('fcm_token',  fcmToken, userId);
						}
						db.updateByField('auth_token', auth_token, userId);
						db.updateByField('login_flag', 1, userId);

						http.send(res, sendData);
					}
					else {
						http.send(res, -2);		// password not matched
					}
	            } 
				else {
					http.send(res, -1);		// email not matched
	            }
	        });
		});
	});
    // term data
	router.post('/getTermById', function(req, res){	
		formParse(req, (fields, files) => {
			db.getTermById(fields, function(result) {
	            http.send(res, result);
	        });
		});
	});
	router.post('/checkDuplicate', function(req, res){	
		formParse(req, (fields, files) => {
			if(!fields.field || !fields.value) {
				http.send(res, false); return;
			}
			db.getUserByFieldDuplicate(fields.field, fields.value, function(result) {
	            http.send(res, result);
	        });
		});
	});
	router.post('/createUser', function(req, res){	
		formParse(req, (fields, files) => {
			if(!fields.email || !fields.password) {
				http.send(res, false); return;
			}
			db.createUser(fields, function(userId) {
				// 
				http.send(res, userId);
			});
		});
	});
    // update password
    router.post('/updatePassByEmail', function(req, res){
	    formParse(req, (fields, files) => {

            const {password} = fields
			db.checkUserEmail(fields, async (result) =>
			{
	            if(result) {
					let encStr = await crypto.getBcryptHash(password);
					db.updateByField('password', encStr, result.id);

					http.send(res, true);
	            } 
				else {
					http.send(res, false);		// email not matched
	            }
	        });
		});
	});
	router.post('/updatePassSendEmail', function(req, res){
		formParse(req, (fields, files) => {
			try {
				const {email} = fields;

				db.checkUserEmail({email}, (result) =>
				{
					if(result) {
						sendMail(result);
						http.send(res, true);
					} 
					else {
						http.send(res, false);		// email not matched
					}
				});

				const sendMail = async (result) => {
					const password = common.generateRandom(100000, 999999);
					const subject = '[aigee] 임시 비밀번호';

					var readHTMLFile = function(path, callback) {
						fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
							if (err) {
								throw err;
								callback(err);
							}
							else {
								callback(null, html);
							}
						});
					};
					
					let smtp_transport = nodemailer.createTransport(smtpTransport({
						service: 'hiworks',
						host: 'smtps.hiworks.com',
						port: 465,
						secure: true,
						auth: {
							user: mailConfig.user,
							pass: mailConfig.pass
						}
					}));
					
					readHTMLFile(__dirname + '/pages/email.html', function(err, html) {
						var template = handlebars.compile(html);
						var replacements = {
							resource_url: config.DOMAIN,
							password
						};
						var htmlToSend = template(replacements);
						var mailOptions = {
							from: mailConfig.user,
							bcc : email,
							subject : subject,
							html : htmlToSend
						 };
						 smtp_transport.sendMail(mailOptions, function (error, response) {
							if (error) {
								// console.log('sendMail', error);
							}
							// console.log('response', response)
						});
					});
					
					let encStr = await crypto.getBcryptHash(password.toString());
					db.updateByField('password', encStr, result.id);

				}
				
			} catch (error) {
				console.log('sendEmail error:', error);
			}
		});	
	});
	router.post('/sendEmail', function(req, res){
		formParse(req, (fields, files) => {
			try {
				const {email, type, lang} = fields;

				db.checkUserEmail(fields, async (result) =>
				{
					if(type == 'reg') {		// register
						if(result) {
							http.send(res, result.reg_type);		// email exist
						} 
						else {
							sendMail();
						}
					}
					else {		// reset password
						if(!result) {
							http.send(res, -1);		// email not exist
						} 
						else if(result.status == 'E') {
							http.send(res, -10);	// member exit
						} 
						else if(result.reg_type != 'E') {
							http.send(res, -11);	// sns email
						} 
						else {
							sendMail();
						}
					}
				});

				const sendMail = async () => {
					const authnum = common.generateRandom(1000, 9999);
					const subject = lang == 'ko' ? '[aigee] 인증번호' : '[aigee] Welcome to the world of AI content : aigee !';

					var readHTMLFile = function(path, callback) {
						fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
							if (err) {
								throw err;
								callback(err);
							}
							else {
								callback(null, html);
							}
						});
					};
					
					let smtp_transport = nodemailer.createTransport(smtpTransport({
						service: 'gmail',
						auth: {
							user: mailConfig.user,
							pass: mailConfig.pass
						}
					}));
					
					readHTMLFile(__dirname + (lang == 'ko' ? '/pages/email.html' : '/pages/email_en.html'), function(err, html) {
						var template = handlebars.compile(html);
						var replacements = {
							resource_url: config.RESOUCE_URL,
							authnum
						};
						var htmlToSend = template(replacements);
						var mailOptions = {
							from: mailConfig.user,
							bcc : email,
							subject : subject,
							html : htmlToSend
						 };
						 smtp_transport.sendMail(mailOptions, function (error, response) {
							if (error) {
								// console.log('sendMail', error);
							}
							// console.log('response', response)
						});
					});
					
					http.send(res, authnum);

				}
				
			} catch (error) {
				console.log('sendEmail error:', error);
			}
		});	
	});
	// send push to one person
	router.post('/sendPush', function(req, res){
		formParse(req, (fields, files) => {
			const {userId, type, target_id} = fields;
			if(!userId || !type || (type != '1' && type != '2')) {
				http.send(res, 'ID error');
				return;
			}
			fcm.sendPushByUserId(userId, parseInt(type) + 6, '', target_id);
			http.send(res, true);
	
		});	
	});
	// send push Notice
	router.post('/sendPushNotice', function(req, res){
		formParse(req, (fields, files) => {
			const {title, target_id, lang} = fields;
			if(!title || !target_id || !lang) {
				http.send(res, 'ID error');
				return;
			}
			// 
			db.getNoticePushUserList(lang, function(result) {
                if(result) {
					const ids = result.ids ? result.ids.split(',') : [];
					// 
					let arrFunctions = [];
					let callbackFn = function(user_id) {
						return function (cb) {
							fcm.sendPushByUserId(user_id, 5, title, target_id);
							cb(null);
						};
					}
					for (let i = 0; i < ids.length; i++) {
						const user_id = ids[i];
						arrFunctions.push(callbackFn(user_id));
					}
					async.parallel(
						arrFunctions,
						function(err, rst) { }
					);
				}
            });
			// 
			http.send(res, true);
		});	
	});

	// for file uploads /////////////////////
	const StorageImage = multer.diskStorage({
		destination(req, file, callback) {
			let filesDir = config.IMAGE_PATH+'/'+common.getFilePath();
			if (!fs.existsSync(filesDir)) {
				var oldmask = process.umask(0);
				fs.mkdirSync(filesDir);
				process.umask(oldmask);
			}
			let filepath = path.join(filesDir);
			callback(null, filepath)
		},
		filename(req, file, callback) {
			let file_name = crypto.md5(new Date().getTime().toString());
			callback(null, `${file_name}${path.extname(file.originalname)}`);
		},
	});
	
	const uploadImage = multer({ storage: StorageImage });
	router.post('/uploadImage', uploadImage.array('file'), function(req, res){
		// console.log('req.body', req.files[0]);
		if(req.files && req.files[0]) {
			const {originalname, filename} = req.files[0];
			const file_path = common.getFilePath() + '/' + filename;
			let file_name = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8');
			http.send(res, {file_path, originalname: file_name}); 
		}
		else {
			http.send(res, false); 
		}
	});

/********************google auth*******************/

	router.post('/getOauth2ClientInfo', function(req, res){
		formParse(req, (fields, files) => {
			
			const {access_token} = fields;
			request.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`, function (error, response, body) {
		
				try {
					if(error) {
						return console.log('error', error);
					}
					else {
						body = JSON.parse(body);
						http.send(res, {email: body.email, nick_name: body.name});
					}
				} catch (error) {
					console.log('json parse error', error)
				}
				
			});   

		});	
	});

/* **************************************** *
  * Common
  * **************************************** */
 
	router.post('/getContentsLinks', function(req, res){	
		formParse(req, function (fields, files) {
			if(!fields) {
				return http.send(res, { hls: '', hd: '', sd: '' });
			}
			const {vimeo_id, type} = fields;
			const options = {
				uri: `https://api.vimeo.com/videos/${vimeo_id}`,
				headers: {
					Authorization: `bearer ${vimeoConfig.ACCESS_TOKEN}`
				}
			};
			request.get(options, function (error, response, body) {
		
				try {
					if(error) {
						return console.log('getContentsLinks error', error);
					}
					else {
						body = JSON.parse(body);
						if(!body.files) {
							return http.send(res, '');
						}
						if(type == 'admin') {
							let files 	= body.files.filter(dt => dt.quality == "sd")[0];
							let sd 	    = files ? files.link : '';
							http.send(res, sd);
						}
						else {
							let files 	= body.files.filter(dt => dt.quality == "hls")[0];
							let hls 	= files ? files.link : '';
							http.send(res, hls);

							// let files 	= body.files.filter(dt => dt.quality == "sd")[0];
							// let sd 	    = files ? files.link : '';
							// http.send(res, sd);
							
							// let files1 	= body.files.filter(dt => dt.rendition == "1080p")[0];
							// let fhd 	= files1 ? files1.link : '';
							// let files2 	= body.files.filter(dt => dt.rendition == "720p")[0];
							// let hd 	    = files2 ? files2.link : '';
							// let files3 	= body.files.filter(dt => dt.rendition == "540p")[0];
							// let sd 	    = files3 ? files3.link : '';
							
						}
					}
				} catch (error) {
					console.log('getContentsLinks json parse error', error)
				}
				
			});
		});
	});
/* **************************************** *
  * clent
  * **************************************** */
 
	router.post('/getHomeData', function(req, res){
		formParse(req, function (fields, files) {
			const {userId} = fields;
			async.parallel([
				function(callback) {
					db.getCategoryList(function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getFollowing(userId, 'home', function(result) {	// 
						callback(null, result);
					});
				},
				function(callback) {
					db.getAppVersion(fields, function(result) {
						callback(null, result);
					});
				},
				],
				function(err, results) {
					if(err) {
						console.log("home parallel err:", err);
						http.send(res, false);
					}
					var sendData = {
						categoryList: 	[],
						followingList: 	[],
						appVersion: 	{},
					};
					if(results[0]) {
						sendData.categoryList = results[0];
					}
					if(results[1]) {
						sendData.followingList = results[1];
					}
					if(results[2]) {
						sendData.appVersion = results[2];
					}
					
					http.send(res, sendData);
					
				}
			);

		});
	});
	router.post('/getMainDataByCategory', function(req, res){	
		formParse(req, (fields, files) => {
			db.getMainDataByCategory(fields, function(result) {
				http.send(res, result);
			});
		});
	});
	// 게시물 상세
	router.post('/getPostDetail', function(req, res){
		formParse(req, function (fields, files) {
			async.parallel([
				function(callback) {
					db.getPostDetail(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getPostComments(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getPostReComments(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getPostRecommend(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getPostPromptBookmark(fields, function(result) {
						callback(null, result);
					});
				},
				],
				function(err, results) {
					if(err) {
						console.log("post detail parallel err:", err);
						http.send(res, false);
					}
					var sendData = {
						postDetail: 	{},
						cmtList: 		[],
						cmtReList: 		[],
						recommendList:	[],
						promptBoomarks:	[],
					};
					if(results[0]) {
						sendData.postDetail = results[0];
					}
					if(results[1]) {
						sendData.cmtList = results[1];
					}
					if(results[2]) {
						sendData.cmtReList = results[2];
					}
					if(results[3]) {
						sendData.recommendList = results[3];
					}
					if(results[4]) {
						sendData.promptBoomarks = results[4];
					}
					
					http.send(res, sendData);
					
				}
			);

		});
	});
	router.post('/addPostView', function(req, res){	
		formParse(req, (fields, files) => {
			db.addPostView(fields, function(result) {
				http.send(res, result);
			});
		});
	});
	// post register
    router.post('/updatePost', function(req, res){
        formParse(req, function (fields, files) {
            db.updatePost(fields, function(result) {
                if(files && files.file && fields.postId == 0 && fields.type == 2) {     // 동영상 등록
                    fields.postId = result;
                    uploadVimeo(files.file.filepath, fields);
                }
                http.send(res, result);
            });
        });
    });
    const uploadVimeo = (filepath, data) => {
        const {postId, title, content} = data
        vimeo_client.upload(                
            filepath,
            {
                'name': title ? title : 'Aigee 동영상',
                'description': content ? content : 'Aigee 동영상'
            },
            function (uri) {
                // 
                var interval = setInterval(() => {
                    vimeo_client.request(uri + '?fields=transcode.status', function (error, body, status_code, headers) {
                        // console.log('uploadVimeo request', uri, body.transcode.status)	// uri = '/videos/607854921'
                        if (body?.transcode?.status === 'complete') {
                            clearInterval(interval);
                            setTimeout(() => {
                                uri = uri.split('/').pop();
                                db.updateVimeoStatus(postId, uri);	// update vimeo status
                                updateVimeoContents(postId, uri);
                            }, 3000);
                        } else if (body?.transcode?.status === 'in_progress') {
                            // console.log('Your video is still transcoding.')
                        } else {
                            // console.log('Your video encountered an error during transcoding.')
                            clearInterval(interval);
                        }
                    });
                }, 5000);
            },
            function (bytes_uploaded, bytes_total) {
                // var percentage = (bytes_uploaded / bytes_total * 100).toFixed(2);
                // console.log('percentage', bytes_uploaded, bytes_total, percentage + '%');
            },
            function (error) {
                // console.log('uploadVimeo Failed because: ' + error);            
            }
        );
    };
    const updateVimeoContents = (postId, uri) => {
	
        const options = {
            uri: `https://api.vimeo.com/videos/${uri}`,
            headers: {
                Authorization: `bearer ${vimeoConfig.ACCESS_TOKEN}`
            }
        }
        request.get(options, function (error, response, body) {
    
            try {
                if(error) {
                    return console.log('error', error);
                }
                else {
                    body = JSON.parse(body);
                    const {duration, pictures} = body;
                    let thumb = pictures.sizes.filter(dt => dt.width == "640")[0];
                    thumb = thumb ? thumb.link : '';
    
                    const data = {
                        postId, duration, thumb
                    }
                    db.updateVimeoContents(data);
                }
            } catch (error) {
                console.log('json parse error', error)
            }
            
        });
    };
	// Aigee 상세
	router.post('/getAigees', function(req, res){
        formParse(req, function (fields, files) {
            db.getAigees(fields, function(result) {
                http.send(res, result);
            });
        });
	});
	// search
	router.post('/getKeywords', function(req, res){
        formParse(req, function (fields, files) {
			async.parallel([
				function(callback) {
					db.getKeywords(1, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getKeywords('all', function(result) {	// 
						callback(null, result);
					});
				},
				],
				function(err, results) {
					if(err) {
						console.log("keyword parallel err:", err);
						http.send(res, false);
					}
					var sendData = {
						todayList: 		[],
						totalList: 		[],
					};
					if(results[0]) {
						sendData.todayList = results[0];
					}
					if(results[1]) {
						sendData.totalList = results[1];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
	});
	router.post('/getSearchData', function(req, res){
        formParse(req, function (fields, files) {
            db.getSearchData(fields, function(result) {
                http.send(res, result);
            });
        });
	});
	// user profile
	router.post('/getUserProfile', function(req, res){
        formParse(req, function (fields, files) {
            db.getMyInfo(fields, function(result) {
                http.send(res, result);
            });
        });
	});
	// profile (user posting)
    router.post('/getUserPosts', function(req, res){	
        formParse(req, function (fields, files) {
            db.getUserPosts(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // my follower
    router.post('/getMyFollowers', function(req, res){	
        formParse(req, function (fields, files) {
            db.getMyFollowers(fields, function(result) {
                http.send(res, result);
            });
        });
    });

	const getChatCrawler = (url, callback) => {
		const c = new Crawler({
			maxConnections: 60,
			callback: (error, res, done) => {
				if (error) {
					// console.log(error);
					callback('');
				} else {
					const $ = res.$;
					// $ is Cheerio by default
					const chatMain = $('main').children().html();
					callback(chatMain);
				}
				done();
			}
		});
		// 
		c.queue(url);

	}
	
	router.get('/previewChatHtml', (req, res) => {	// not use
		const htmlPath  = fs.readFileSync(__dirname + '/pages/chatShare.ejs', 'utf-8');
		const url  	= req.query.url;		// from web
		
		getChatCrawler(url, (html) => {
			var render = ejs.render(htmlPath, {html, url});
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			res.write(render);
			res.end();
		})
	});
	router.get('/previewChat', (req, res) => {
		const url  	= req.query.url;		// from web
		
		getChatCrawler(url, (html) => {
			if(html) {
				html = html.replace(/style="background-color:#e06c2b"/g, '');
				html = html.replace(/style="background-color:#E06C2B"/g, '');
				const re1 = new RegExp(`<svg width="41" height="41" viewbox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" class="h-6 w-6" role="img"><text x="-9999" y="-9999">ChatGPT</text><path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="currentColor"/></svg>`, 'g');
				const re2 = new RegExp(`<svg width="41" height="41" viewbox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" class="h-6 w-6" role="img"><title>ChatGPT</title><text x="-9999" y="-9999">ChatGPT</text><path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="currentColor"/></svg>`, 'g');
				const re3 = new RegExp(`<div style="background-color:#E06C2B;width:36px;height:36px" class="relative p-1 rounded-sm h-9 w-9 text-white flex items-center justify-center"><svg width="41" height="41" viewbox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md" role="img"><text x="-9999" y="-9999">ChatGPT</text><path d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z" fill="currentColor"/></svg></div>`, 'g');
				html = html?.replace(re1, '<img class="w-36px" src="/img/i_chat.png" />') || '';
				html = html?.replace(re2, '<img class="w-36px" src="/img/i_chat.png" />') || '';
				html = html?.replace(re3, '<img class="w-36px" src="/img/i_chat.png" />') || '';
				const chatFooter = `<div class="absolute bottom-0 left-0 w-full border-t md:border-t-0 dark:border-white/20 md:border-transparent md:dark:border-transparent md:bg-vert-light-gradient bg-white dark:bg-gray-800 md:!bg-transparent dark:md:bg-vert-dark-gradient pt-2 md:pl-2 md:w-[calc(100%-.5rem)]"><div class="relative flex h-full w-full flex-1 items-center justify-center gap-2"><a target="_blank" class="btn relative btn-primary" as="link" to="${url}/continue" href="${url}/continue"><div class="flex w-full gap-2 items-center justify-center">Continue this conversation</div></a></div><div class="px-3 pb-3 pt-2 text-center text-xs text-gray-600 dark:text-gray-300 md:px-4 md:pb-6 md:pt-3"><div class="flex justify-center gap-3 text-gray-500"><a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noreferrer">Terms of use</a><span>|</span><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer">Privacy policy</a></div></div></div>`;
				const sendData   = Boolean(html) ? (html + chatFooter) : '';
				http.send2(res, sendData);
			}
			else {
				http.send2(res, '');
			}
		})
	});
    // fetch tag, mention list
    router.post('/fetchTriggerList', function(req, res){	
        formParse(req, function (fields, files) {
            const {content} = fields;
            if(!content) {
                http.send(res, false);
            }
            async.parallel([
				function(callback) {
					db.fetchMentionList(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.fetchTagList(content, function(result) {
						callback(null, result);
					});
				},
				],
				function(err, results) {
					if(err) {
						console.log("fetchTriggerList parallel err:", err);
						http.send(res, false);
					}
					var sendData = {
                        mentionList: [],
                        tagList:     '',
					};
					if(results[0]) {
						sendData.mentionList = results[0];
					}
					if(results[1]) {
						sendData.tagList = results[1];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
    });

	// rss
	const generateRssFeed = async (posts) => {
		const feed = new Feed({
			title: "aigee's RSS Feed",
			description: "join aigee now and start monetizing your AI creations. Share and enjoy with prompt engineers, AI creators, chatgpt, friends, and family around the world.",
			id: config.SERVER_IP,
			link: config.SERVER_IP,
			language: "en-US",
			image: "https://aigee.ai/thumb.jpg",
			favicon: "https://aigee.ai/favicon.png",
		});
	
		posts.forEach((post) => {
			const {id, type, title, imgs} = post;
			let category = '';
			
			if(type == 1) {
			  category = Boolean(imgs) ? 'images' : 'community';
			}
			else if(type == 2) {
			  category = 'videos';
			}
			else if(type == 3) {
			  category = 'chatgpt';
			}
			
			let url = '';
			try {
				url = `${config.SERVER_IP}/${category}/${id}/${common.removeSpecials(title)}`;
			} catch (error) {
				// console.log(error)
			}

			feed.addItem({
				title: post.title,
				id:    url,
				link:  url,
				description: post.content,
				date: post.reg_time,
			});
		});
	
		return feed.rss2();
	};
	router.get('/rss', async (req, res) => {
		db.getMainRss(async function(result) {
			const rss = await generateRssFeed(result);
		  
			res.setHeader("Content-Type", "text/xml");
			res.write(rss);
			res.end();
		});
	});
    router.post('/getPostInfo', function(req, res){	
        formParse(req, function (fields, files) {
            db.getPostInfo(fields, function(result) {
                http.send(res, result);
            });
        });
    });
/*********************************************/

module.exports = router;