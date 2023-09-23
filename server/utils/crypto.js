const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const CryptoJS = require("crypto-js");

exports.md5 = function (content) {
	const md5 = crypto.createHash('md5');
	md5.update(content);
	return md5.digest('hex');	
}
// 
exports.toBase64 = function(content){
	return Buffer.from(content).toString('base64');
}

exports.fromBase64 = function(content){
	return Buffer.from(content, 'base64').toString();
}
// 
exports.toAESCrypto = function(content){
  try {
		const DataKey = CryptoJS.enc.Utf8.parse("01234567890123456789012345678901");
		const DataVector = CryptoJS.enc.Utf8.parse("1234567890123412");
		const ciphertext = CryptoJS.AES.encrypt(content, DataKey, { iv: DataVector }).toString();
		return ciphertext;
  } catch(error) {
    throw error;
  }
}

exports.fromAESCrypto = function(content){
  try {
		const DataKey = CryptoJS.enc.Utf8.parse("01234567890123456789012345678901");
		const DataVector = CryptoJS.enc.Utf8.parse("1234567890123412");
		let decrypted = CryptoJS.AES.decrypt(content, DataKey, { iv: DataVector });
		return CryptoJS.enc.Utf8.stringify(decrypted);
  } catch(error) {
    throw error;
  }
}
// 
const convertorBcrypt = async (content) => {
		let salt = await bcrypt.genSalt(10);
		let hash = await bcrypt.hash(content, salt);
		hash = hash.replace(/^\$2a(.+)$/i, '\$2y$1');
		return hash;
}
const compareBcrypt = async (str1, str2) => {
		let value = await bcrypt.compare(str1, str2.replace(/^\$2y(.+)$/i, '\$2a$1'));
		return value;
}
exports.getBcryptHash = async (content) => {
  try {
		let retval = await convertorBcrypt(content);
		return retval;
  } catch(error) {
    throw error;
  }
}
exports.compareBcryptHash = async (str1, str2) => {
  try {
		let retval = await compareBcrypt(str1, str2);
		return retval;
  } catch(error) {
    throw error;
  }
}
