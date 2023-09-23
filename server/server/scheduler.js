'use strict';

const schedule = require('node-schedule');

var Verifier = require('google-play-billing-validator');
const appleReceiptVerify = require('node-apple-receipt-verify');
const Stripe = require('stripe');
const request = require('request');

const db   = require('../utils/db');
const configs = require("../configs");
const config = configs.app_server();
const configMy = configs.mysql();
const {googleApis, stripeConfig, vimeoConfig} = require("../configs");
const routes = require('./http_service');


/********************cron tab*******************/
// google iap
function ValidationIAB(data) {
	const {id, user_id, receipt} = data;
    let packageName = googleApis.packageName;
	let productId 	= googleApis.productId;
	
	var options = {
		"email": googleApis.client_email,
		"key": 	 googleApis.private_key,
	};
	var verifier = new Verifier(options);
	let param = {
		packageName,
		productId,
		purchaseToken: receipt
	};
	let promiseData = verifier.verifySub(param);

	promiseData.then(function(response) {
		let mem_type = 1;	// 무료회원
		// console.log('ValidationIAB response', response);
		if (response.isSuccessful) {
			if(!response.payload.paymentState) {	// expire
				mem_type = 1;
				db.updatePayment(id, 1, function(result) {});
			}
			else if(response.payload.paymentState === 1) {	//-> 유료회원 유지
				// 0: This purchase hasn’t been processed yet.
				// 1: Subscription was purchased.
				// 2: Subscription is in the trial period.
				// 3: Subscription will be up- or downgraded in the next period.
				mem_type = 2;
			}
		}
		// 
		db.updateByField('mem_type', mem_type, user_id, function(result) {});
	})
	.catch(function(error) {
		// console.log('promiseData error', error);
		// error: 구독 취소 ... > 무료회원으로
		db.updateByField('mem_type', 1, user_id, function(result) {});
		db.updatePayment(id, 1, function(result) {});	// purchar_status=1 // cancel
	})
}
// ios
function ValidationAppleIAB(data) {
	const {id, user_id, amount, receipt} = data;

	appleReceiptVerify.config({
		secret: googleApis.appleSecret,		// 애플 구독 보안 코드
		// environment: ['sandbox']			// 일반 결제일 때 사용
		environment: ['sandbox', 'production']
	});

	appleReceiptVerify.validate({
		receipt,
  	}, (err, products) => {
		let mem_type = 1;
		if (err) {
			// return console.error(err);
			db.updatePayment(id, 1, function(result) {});
		}
		// ok!
		if(Boolean(products) && products.length == 1) {
			// 구독중
			mem_type = 2;
		}
		else {
			db.updatePayment(id, 1, function(result) {});
		}
		// console.log('products', id, user_id, products)
		// error: 무료회원으로
		db.updateByField('mem_type', mem_type, user_id, function(result) {});
	});
}
// stripe verify (no use)
const stripeValidation = async () => {
    try {
        const stripe = new Stripe(stripeConfig.secret_key);
        
        // const refunds = await stripe.refunds.list({		// 환불목록
        //     limit: 100,
        // });
		const subscriptions = await stripe.subscriptions.search({	// 구독취소한 목록
			query: 'status:\'canceled\'', limit: 100
		});
        // console.log('customer', customer)
        db.checkStripeSubscribe(function(result) {		// 구독 목록
			// refunds?.data?.map(refund => {
			// 	for(let i in result) {
			// 		let data = result[i];
			// 		if(refund.payment_intent == data.order_id) {		// 환불됨
			// 			db.updatePayment(data.id, 1, function(result) {});
			// 			db.updateByField('mem_type', 1, data.user_id, function(result) {});
			// 		}
			// 	}
			// });
			// 
			subscriptions?.data?.map(cancel => {
				for(let i in result) {
					let data = result[i];
					if(cancel.id == data.subscription_id) {		// 환불됨
						db.updatePayment(data.id, 1, function(result) {});
						db.updateByField('mem_type', 1, data.user_id, function(result) {});
					}
				}
			});
		});
    } catch (error) {
        console.log(error)
    }
};
// 
const setCronTab = function () {	
	// '0 0 * * * *'	// 매 시00분00초 마다
	// '0 * * * * *'	// 매분00초 마다
	// '*/5 * * * * *'  // 5초마다
	// '0 */5 * * * *'  // 5분 마다 
    
	//  - 1일 간격
	schedule.scheduleJob('0 0 0 */1 * *', function(){   // - 1일 간격
		// 구독 해지한 회원 > 일반회원으로
        db.checkMemPaymentExpireTime(function(result) {	});
		// 구독결제 영수증 검증
        db.checkSubscribeTokens(function(result) {
			for(let i in result) {
				let data = result[i];
				if(data.pay_type == 'G') {	// 구글 결제
					ValidationIAB(data);
				}
				else {	// 애플
					ValidationAppleIAB(data);
				}
			}
		});
    });
	
	//  - 5분 간격으로
	schedule.scheduleJob('0 */5 * * * *', function(){
		// 
		// stripeValidation();
		// check vimeo thumb
        db.checkVideoPostThumb(function(result) {
			for(let i in result) {
				const data = result[i];
				const {id, vimeo_id} = data;
				updateVimeoContents(id, vimeo_id);
			}
		});
	});
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
				let thumb = pictures?.sizes.filter(dt => dt.width == "640")[0];
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
}

// stripeValidation();
setCronTab();
