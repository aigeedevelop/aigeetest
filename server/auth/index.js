'use strict';

const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const async = require("async");
const request = require('request');
const Stripe = require('stripe');
const router = express.Router();

const db = require('../utils/db');
const http = require('../utils/http');
const common = require('../server/common');
const crypto = require('../utils/crypto');
const configs = require("../configs");
const config = configs.app_server();
const {stripeConfig} = require("../configs");


/****************** COMMON ***************************/

const formParse = function (req, callback) {
    try {
        var form = new formidable.IncomingForm();
        form.multiples = true;
        form.parse(req, function (err, fields, files) {
            const userId = req.headers['x-access-id'];
            callback(fields, files, userId);
        });	
        form.on('error', function(err) {
            // console.log(`formParse: ${req.url}, ${err}`);
        });
    } catch (error) {
        console.log(`auth/index.js formParse error: ${req.url}, ${error}`);
    }
}

// for file uploads /////////////////////
const Storage = multer.diskStorage({
    destination(req, file, callback) {
        let filesDir = config.IMG_PATH+'/'+common.getFilePath();
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir);
        }
        let filepath = path.join(filesDir);
        callback(null, filepath)
    },
    filename(req, file, callback) {
        let file_name = crypto.md5(new Date().getTime().toString());
        callback(null, `${file_name}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage: Storage });

router.get('/test', function(req, res) {
    console.log('test');
});
/* **************************************** *
  * clent
  * **************************************** */

    router.post('/updateMyInfo', function(req, res){	
        formParse(req, function (fields, files, userId) {
            db.updateByField(fields.field, fields.data, userId, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/checkMemberStatus', function(req, res){	
        formParse(req, function (fields, files, userId) {
            db.getUserInfoById(userId, function(result) {
                const {stop, mem_type} = result;
                http.send(res, {stop, mem_type});
            });
        });
    });
    router.post('/getBadgeCnt', function(req, res){	
        formParse(req, function (fields, files, userId) {
            db.getBadgeCnt(userId, function(result) {
                http.send(res, result);
            });
        });
    });
    // 게시물 상세에서
    router.post('/updateFollowing', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateFollowing(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/updateBookmark', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateBookmark(fields, function(result) {
                http.send(res, result);
            });
        });
    });
	router.post('/addReport', function(req, res){
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
			db.addReport(fields, function(result) {
				http.send(res, result);
			});
		});
	});
	router.post('/addBlacklist', function(req, res){
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
			db.addBlacklist(fields, function(result) {
				http.send(res, result);
			});
		});
	});
    router.post('/addShare', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.addShare(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/updateLike', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateLike(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/deletePost', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.deletePost(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/addComment', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.addComment(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/deleteCmt', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.deleteCmt(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // register post
    router.post('/getPostData', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getPostData(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/updateChatGPTPost', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateChatGPTPost(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // bookmark
    router.post('/getBookmarks', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            async.parallel([
				function(callback) {
					db.getFolders(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
                    fields.type = 1;
					db.getMyBookmarks(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
                    fields.type = 2;
					db.getMyBookmarks(fields, function(result) {
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
						folderList: [],
						postList:	[],
						promptList:	[],
					};
					if(results[0]) {
						sendData.folderList = results[0];
					}
					if(results[1]) {
						sendData.postList = results[1];
					}
					if(results[2]) {
						sendData.promptList = results[2];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
    });
    router.post('/getBookmarkByFId', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            async.parallel([
				function(callback) {
					db.getFolderInfoById(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
                    db.getBookmarkByFId(fields, function(result) {
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
						folderInfo: {},
						dataList:	[]
					};
					if(results[0]) {
						sendData.folderInfo = results[0];
					}
					if(results[1]) {
						sendData.dataList = results[1];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
    });
    router.post('/getBookmarkFolderById', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            async.parallel([
				function(callback) {
					db.getFolderInfoById(fields, function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getBookmarksUnFoldered(fields, function(result) {
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
						folderInfo:     {},
						bookmarkList:	[]
					};
					if(results[0]) {
						sendData.folderInfo = results[0];
					}
					if(results[1]) {
						sendData.bookmarkList = results[1];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
    });
    router.post('/updateFolder', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateFolder(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/deleteFolder', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.deleteFolder(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // setting
    router.post('/getMyInfo', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getMyInfo(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/getNotice', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getNotice(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/getNoticeById', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getNoticeById(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/updatePass', function(req, res){	
        formParse(req, function (fields, files, userId) {
			const {oldpassword, password} = fields;
			db.getUserInfoById(userId, async (result) => {
	            if(result) {
                    const checkPass = await crypto.compareBcryptHash(oldpassword, result.password);
                    if(!checkPass) {
                        return http.send(res, false);   // pw not match
                    }
                    let encStr = await crypto.getBcryptHash(password);
                    db.updateByField('password', encStr, userId, (result) => {
                        http.send(res, true);
                    });
	            } 
				else {
					http.send(res, false);		// not exit user
	            }
	        });
        });
    });
    router.post('/memberExit', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.memberExit(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // '좋아요 게시물' : '댓글단 게시물'
    router.post('/getMyContents', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getMyContents(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/getBlackList', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getBlackList(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/updateBlackList', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.updateBlackList(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/getFaqs', function(req, res){	
        formParse(req, function (fields, files, userId) {
            async.parallel([
				function(callback) {
					db.getFaqKinds(function(result) {
						callback(null, result);
					});
				},
				function(callback) {
					db.getFaqs(function(result) {	// 
						callback(null, result);
					});
				},
				],
				function(err, results) {
					if(err) {
						console.log("faq parallel err:", err);
						http.send(res, false);
					}
					var sendData = {
						faqKindList: 	[],
						faqList: 		[],
					};
					if(results[0]) {
						sendData.faqKindList = results[0];
					}
					if(results[1]) {
						sendData.faqList = results[1];
					}
					
					http.send(res, sendData);
					
				}
			);
        });
    });
    router.post('/setFaqHits', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.setFaqHits(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // improve
	router.post('/sendImprove', function(req, res){
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.sendImprove(fields, function(result) {
                http.send(res, result);
            });
        });
	});
    // mypage
    router.post('/getMyPosts', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getMyPosts(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // alarm
    router.post('/getAlarmList', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getAlarmList(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/delAlarm', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.delAlarm(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    // user follower - from home
    router.post('/getUserFollowers', function(req, res){	
        formParse(req, function (fields, files, userId) {
            db.getFollowing(userId, 0, function(result) {
                http.send(res, result);
            });
        });
    });
    // web stripe payment - stripeCreateSubscription
    router.post('/stripeCreateSubscription', function(req, res){	
        formParse(req, async function (fields, files, userId) {
            try {
                const stripe = new Stripe(stripeConfig.secret_key);
                const {name, email, paymentMethod} = fields;
                // create a stripe customer
                const customer = await stripe.customers.create({
                  name: name,
                  email: email,
                  payment_method: paymentMethod,
                  invoice_settings: {
                    default_payment_method: paymentMethod,
                  },
                });
            
                // get the price id from the front-end
                const priceId = stripeConfig.priceId;
            
                // create a stripe subscription
                const subscription = await stripe.subscriptions.create({
                  customer: customer.id,
                  items: [{ price: priceId }],
                  payment_settings: {
                    payment_method_options: {
                      card: {
                        request_three_d_secure: 'any',
                      },
                    },
                    payment_method_types: ['card'],
                    save_default_payment_method: 'on_subscription',
                  },
                  expand: ['latest_invoice.payment_intent'],
                });
            
                // return the client secret and subscription id
                const sendData = {
                  clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                  subscriptionId: subscription.id,
                };
    
                http.send(res, sendData);
            } catch (error) {
                const sendData = {
                    error: error?.type,
                    clientSecret: '',
                    subscriptionId: '',
                };
    
                http.send(res, sendData);
            }
        });
    });
    router.post('/stripeCheckoutSessionID', function(req, res){	    // check customer email from Checkout Session ID
        formParse(req, async function (fields, files, userId) {
            try {
                const stripe = new Stripe(stripeConfig.secret_key);
                const {sessionID, email} = fields;
                
                const session = await stripe.checkout.sessions.retrieve(
                    sessionID
                );
                // console.log('session', session)

                const {customer_details, subscription, amount_total} = session;
                if(email == customer_details?.email) {  // 결제 본인 맞음(결제 성공)
                    const payData = {
                        userId, 
                        amount: amount_total / 100, 
                        subscription_id: subscription
                    }
                    db.getPayDataBySubscriptionID(subscription, function(result) {   // 구독 아이디 중복 검사
                        if(!result) {
                            db.addStripePayment(payData, function(result) {
                                http.send(res, true);
                            });
                        }
                        else {
                            http.send(res, false);
                        }
                    });
                }
                
            } catch (error) {
                // console.log(error)
                http.send(res, false);
            }
        });
    });
    router.post('/stripeCancelSubscription', function(req, res){	    // cancel Subscription
        formParse(req, async function (fields, files, userId) {
            try {
                const stripe = new Stripe(stripeConfig.secret_key);
                const {payId, subscriptionId, pay_type, next_month} = fields;
                let status = true;
                if(pay_type == 'S') {
                    const deleted = await stripe.subscriptions.cancel(subscriptionId);
                    status = deleted?.status == 'canceled' ? true : false;
                }
                if(status) {     // 구독 취소됨 - 기간 만료되면 구독 해지됨
                    db.updatePaymentExpireTime(payId, next_month, function(result) {});
                    db.updateByField('pay_expire_time', next_month, userId, function(result) {});
                }

                http.send(res, true);
            } catch (error) {
                // console.log(error)
                http.send(res, false);
            }
        });
    });
    // add payment 
    router.post('/addStripePayment', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.addStripePayment(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/addInAppPayment', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.addInAppPayment(fields, function(result) {
                http.send(res, result);
            });
        });
    });
    router.post('/getPayData', function(req, res){	
        formParse(req, function (fields, files, userId) {
            fields.userId = userId
            db.getPayData(fields, function(result) {
                http.send(res, result);
            });
        });
    });
/*****************************************/
module.exports = router;