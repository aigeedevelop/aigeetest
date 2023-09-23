const development = false;

const SERVER_IP = development ? "192.168.3.132" : "https://aigee.ai";
const PORT 		= 3500;

const DOMAIN 	= development ? "http://localhost:3000" : "https://aigee.ai";

const IMAGE_PATH = development ? "E:/xampp/htdocs/aigee_admin/uploads" : "/var/www/html/uploads";

const RESOUCE_URL = development ? "http://localhost/aigee_admin/uploads" : "https://aigee.ai/uploads";

exports.mysql = function(){
	return {
		HOST:'localhost',
		USER:'root',
		PSWD:'globalno.1$',
		DB:'aigee_db',
		PORT:3306,
	}
};

exports.app_server = function(){
	return {
		SERVER_IP,
		PORT,
		IMAGE_PATH,
		DOMAIN,
		RESOUCE_URL
	};
};

exports.mailConfig = {
	user: "aigeeprivacy@gmail.com",
	pass: "iwilpnfmmfibjncm"
};
exports.stripeConfig = {		// test
	secret_key: "sk_test_51NKdDaBzyfm8h33wFKZPblaY4x8pmKuyVz7F2EdeDS5XvPJ1EqmZTT0ek7mNYHROQFHK9wuxVa4T3Vv08yfn1Xvf00xd7DmaHr",
	priceId: 	"price_1NLMbLBzyfm8h33wdxzJ6t7b"
};
// exports.stripeConfig = {	// live
// 	secret_key: "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",
// 	priceId: 	"price_1NbGOxBzyfm8h33ws0gFUpu5"
// };
exports.vimeoConfig = {
	CLIENT_ID: "cadfe215290eb49ed10f45a856c2a104278808ed",
	CLIENT_SECRET: "iX4Ld6oHhdBhy9Zi87t9n19es77Ye1Yz+BYKCOEaPqKU1BRH9xuen8OCktn1oKOepIG/qT/a60PQn86+VxHKbInr3rZ+GGvO/bIxcY/RtR8b16GKRsAaprPYj+u83d2r",
	ACCESS_TOKEN: "dac851c504cc5b42266d54ec06a60c55"
};

exports.googleApis = {
	appleSecret: 	'a731cab654fe4fd9b851e3457ae35054',
	packageName: 	'ai.aigee.aigee',
	productId: 		'ai.aigee.aigee.month',

	client_email: "iap-validating-service@aigee-389605.iam.gserviceaccount.com",
	private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDOkFe6DVn+MhcA\nG+YvJtslukcTSqmzsbWAbkMXNfTQ8O0GW97OPwVBAegyc3k8qkPO0in7hkr5AMn2\nDlUgc2R9U55ysyawAW+ExyWIH6P2xzxhiVD9UqdrdHMvPYN2pZyUXAGuuIYPlm8P\nAml6yeigrvF9dFtHt57cc5a44bUbU7f0DRhEtPnzrtk0R0T35JRqkKYJjQ2pzpGI\nn6GZvfl4ZcRiN3DY1QnQbnN9gaLrHVHnBpsj7FqybY8fl4KkSCubdZJgqgVUrDoN\n8yE1NsXIaUkvdh30Ol7wd/NZOw5S+YAqaDwhN935GO5ytP6MENazt3fXmDenPWih\nUSlYEwmrAgMBAAECggEAD6gHyNr44TgcCi691FZrnIEb9gMIuHgAZnWfsYNYxPrI\nhweGQberxvDwD92KE5EMMVbjRmSNYNuFyJfu19YnMwtCzTV1pI2B+Fxnzy4mwq5N\n406sdtGW+EwL7Elgoijh+f9nQ+j0haXvUQHry29rqbzYzPDOzQbGjGBZIjY+qzga\n/wBk5VyXGOjiT3Z5pKMFLbzdie4wd67WUXVska3hn7qevzobhSEmEhUjjJ4wx3XD\nk/15NcILEVcQ0ZhvV6XLM0cgogyRPgsBEoBLcJ/vGY9BND2vmPt+4u7vCwoV1dDv\ndlID4p4mp1Y9wds6SVbPBP9vXzCCAQK2iU1TFCqeEQKBgQDw269jFJ4CzMa5pH5H\nPBa0QZztjcJMe3sxS9hbfud5c1aX+x9zXzQOJdBPC7twYVKzLsqo5V1TxOnHbJG3\nraE3xnCDh6vb3cRRWlVCU5ntzyzX0V7+Ej3cpEQaaFggLmV3+bXwTdMJ4pnFXGa8\nSXf5nvyj1EfIz/4qmu+Y6h0e9wKBgQDbjLultH8u8MKB4DXqx44DlAI4+Z/SOqCT\n7j/v4Ov5qp3woMVSNNgrJ3r6m/HUG02bbxnV+SAuOwTjdfBFV3uMmbOIEe443BOx\nK6k/AFxeRR09r16QD5dvYPbCrbFxvQS6ehPLBSRgXOJUVq0Cone5ZKgv7BgySvYm\n+FYAFZLZ7QKBgAWwarggaIsQYzFHXWQ5Wx/u3NIPoyNDV2mWrQmcOcN4ofb9C4Ui\nHoynAACd+lNxOQ7acBcFM+sin5MCUX7RLxmuKkIxFjIfTt/NDm5+owgm+Jwwadn+\nfE+V4bXt+QbpkaP/1fhTHkUBgThUMmkIIzlWNAl6nid0IkDHYBlwjjeJAoGBAIMi\nA9JthKmc1BCOwqWAm6o3dTxinLsMmWzCGR5F0axF5CAdZr47IgJkime1TTPLOwdj\nzKKpMjdquPjDMMe6AOlxxHG5g/giOwDPez9OD92emmCFpo2VQnYcDEcrR5kPtQtM\nbxYL9DY6RFTrkFrKf4gUPwCgm7MuYufT3EogmJ3hAoGASPlNuFRILkPCXls3cRYe\n+XrVZFdz0QYXHRMrOTWQrSGOcFTT6pDM0t9egUCI8AoZkgIw5HPOsacRpMFdn+wR\n6SqI66nlwx6vbjCPQegIXZ0QYqm25DwVMN/kmtqfSdiECYf2xa+ZeQspqGc8rTg9\nI3g+dvifz8wvOD7VCbxakIw=\n-----END PRIVATE KEY-----\n",
};