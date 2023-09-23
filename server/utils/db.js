'use strict';

var async = require("async");
var mysql = require("mysql");  
var crypto = require('./crypto');
var emojiRegex = require('emoji-regex');
var common = require('../server/common');
const fcm    = require('../utils/fcm');
const configs = require("../configs");
const config = configs.app_server();
var conf = null;
var pool = null;

/********************Common*********************/
    function nop(){
        return
    }
      
    function query(sql,callback){  
        pool.getConnection(function(err,conn){  
            if(err){  
                callback(err,null,null);  
            }else{  
                conn.query(sql,function(qerr,vals,fields){  
                    conn.release();  
                    callback(qerr,vals,fields);  
                });  
            }  
        });  
    };

    function getQuery(sql, callback) {
        
        query(sql, function(err, rows, fields) {
            if (err) {
                callback([]);
                throw err;
            }
            else {
                if(rows.length == 0){
                    callback([]);
                    return;
                }    
                callback(rows);
            }
        }); 
    }

    function updateQuery(sql, callback) {
        
        query(sql, function(err, rows, fields) {
            if (err) {
                if(err.code == 'ER_DUP_ENTRY'){
                    callback(false);
                    return;
                }
                callback(false);
                throw err;
            }
            else {
                callback(true);
            }
        });
    }

    function insertQuery(sql, callback) {
        query(sql, function(err, rows, fields) {
            if (err) {
                if(err.code == 'ER_DUP_ENTRY'){
                    callback(false);
                    return;
                }
                callback(false);
                throw err;
            }
            else {
                callback(rows.insertId);
            }
        });
    }

    // 
    function query2(sql, datas, callback){  
        pool.getConnection(function(err,conn){  
            if(err){  
                callback(err,null,null);  
            }else{  
                conn.query(sql, datas, function(qerr,vals,fields){  
                    conn.release();  
                    callback(qerr,vals,fields);  
                });  
            }  
        });  
    };
    function updateQuery2(sql, datas, callback) {
        
        query2(sql, datas, function(err, rows, fields) {
            if (err) {
                if(err.code == 'ER_DUP_ENTRY'){
                    callback(false);
                    return;
                }
                callback(false);
                throw err;
            }
            else {
                callback(true);
            }
        });
    }

    function insertQuery2(sql, datas, callback) {
        query2(sql, datas, function(err, rows, fields) {
            if (err) {
                if(err.code == 'ER_DUP_ENTRY'){
                    callback(false);
                    return;
                }
                callback(false);
                throw err;
            }
            else {
                callback(rows.insertId);
            }
        });
    }

    function delQuery(sql, callback) {
        
        query(sql, function(err, rows, fields) {
            if (err) {
                callback(false);
                throw err;
            }
            else {
                callback(true);
            }
        });
    }

    const replaceEmoji = function (str) {
        if(!str) return '';
        str = str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        return str.replace(/"/g, '\\"').replace(/'/g, "\\'").replace(emojiRegex(), '');
    }

    const genRandId = function (){
        return crypto.md5(new Date().getTime().toString());
    }
    const removeQuate = function(str) {
        if(!str) return "";
        return Boolean(str) ? str.substr(1, str.length-2) : ""
    };
    const replaceQuoteAll = function(str) {
        if(!str) return "";
        str = str.replace(/"/g, '\"');
        str = str.replace(/'/g, "\'");
        str = str.replace(/`/g, "\'");
        return str;
    };
    const replaceQuotes = function(str) {
        if(!str) return "";
        // str = str.replace(/"/g, '˝');
        // str = str.replace(/'/g, '˝');
        // str = str.replace(/`/g, '˝');
        str = str.replace(/"/g, '\"');
        return str;
    };
    const replaceOneQuotes = function(str) {
        if(!str) return "";
        str = str.replace(/'/g, "\'");
        return str;
    };

    exports.init = function(config){
        pool = mysql.createPool({  
            host: config.HOST,
            user: config.USER,
            password: config.PSWD,
            database: config.DB,
            port: config.PORT,
            charset: 'utf8mb4' 
        });
        conf = config;
    }; 

    exports.multi_query = function(sqlList, cnt, callback){
        callback = callback == null? nop:callback;

        var connection = mysql.createConnection({  
            host: conf.HOST,
            user: conf.USER,
            password: conf.PSWD,
            database: conf.DB,
            port: conf.PORT,
            multipleStatements: true
        });
        connection.connect();
        
        connection.query(sqlList, [1, cnt], function(error, results, fields) {
            if (error) {
                callback(null);
                throw error;
            }
            else{
                if(results.length > 0)
                    callback(results);
                else
                    callback(0);

            }        
        });
        connection.end();    
    };

/********************User*********************/

    exports.checkToken = function(id, token, callback){
        callback = callback == null? nop:callback;
        
        let sql = 'SELECT COUNT(*) AS cnt FROM tbl_users WHERE id="'+id+'" AND status="N"';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    exports.checkApiToken = function(user_id, token, callback){
        callback = callback == null? nop:callback;
        
        let sql = 'SELECT COUNT(*) AS cnt FROM tbl_api_users WHERE user_id="'+user_id+'" AND auth_token="'+token+'" ';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };

    exports.checkUserEmail = function(field, callback){
        callback = callback == null? nop:callback;
        
        var sql = 'SELECT * FROM tbl_users WHERE email="'+field.email+'" AND status<>"D"';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    exports.getUserByFieldDuplicate = function(field, value, callback){
        callback = callback == null? nop:callback;
        
        if(!field) {
            callback(false);
            return;
        }
        var sql = 'SELECT id, reg_type, email, nickname FROM tbl_users WHERE `'+field+'`="'+value+'" AND status<>"D"';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    exports.getUserByField = function(field, value, callback){
        callback = callback == null? nop:callback;
        
        if(!field) {
            callback(false);
            return;
        }
        var sql = 'SELECT * FROM tbl_users WHERE `'+field+'`="'+value+'"';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };

    exports.createUser = (data, callback) => {
        callback = callback == null? nop:callback;
        if(data == null ) {
            callback(false);
            return;
        }
        const {reg_type, platform, email, password, nickname, profile, marketing, country} = data;

        var sql = 'SELECT id FROM tbl_users WHERE email="'+email+'"';
        getQuery(sql, async function(rows) {
            if(rows[0]) {   // 존재하는 이메일
                callback(-1);
            }
            else {
                let encStr = await crypto.getBcryptHash(password+'');
                sql = `INSERT INTO tbl_users( reg_type, platform, email, password, nickname, profile, status, marketing, reg_country) 
                        VALUES("${reg_type}", "${platform}", "${email}", "${encStr}", "${nickname}", "${profile ? profile : ''}", "N", "${marketing}", "${country}")`;
                
                insertQuery(sql, function (insertId) {
                    callback(insertId);
                }); 
            }
        });
    };

    exports.deleteUser = function(id, callback){
        callback = callback == null? nop:callback;
        if(id == null || id < 1) {
            callback(false);
            return;
        }
        
        var sqlList = 'DELETE FROM tbl_users WHERE id="'+id+'";';
            
        exports.multi_query(sqlList, 1, function(ret) {
            if(ret != null) {
                callback(true);
            }
        });
    };

    exports.getUserInfoById = function(id, callback){
        callback = callback == null? nop:callback;
        if(!id || id == 'undefined') {
            callback(null);
            return;
        }

        let sql = `SELECT *,
                    (SELECT COUNT(id) FROM tbl_alarm WHERE user_id="${id}" AND read_flag=0) AS alarm_cnt
                    FROM tbl_users WHERE id="${id}"`;
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    exports.getUserNickProfileById = function(id, callback){
        callback = callback == null? nop:callback;
        if(!id || id == 'undefined') {
            callback(null);
            return;
        }

        var sql = 'SELECT nickname, profile FROM tbl_users WHERE id="'+id+'"';
        
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };

    exports.getUserInfoList = function(callback){
        var sql = 'SELECT * FROM tbl_users ORDER BY createdAt';
        
        getQuery(sql, function(rows) {
            callback(rows);
        }); 
    };

    exports.updatePassword = function(email, value, callback){
        callback = callback == null? nop:callback;
        if( value == null || email == null) {
            callback(false);
            return;
        }
        
        var sql = 'UPDATE tbl_users SET `password`=PASSWORD("'+value+'") WHERE email="'+email+'"';
        
        updateQuery(sql, function(result) {
            callback(result);
        });
    };

    exports.updateByField = function(field, data, userId, callback=()=>{}){
        callback = callback == null? nop:callback;
        if(!field) {
            callback(false);
            return;
        }
        let sql = 'UPDATE tbl_users SET '+field+'="'+data+'" WHERE id="'+userId+'"';
        
        updateQuery(sql, function(result) {
            if(field == 'mem_type' || data == 1) {  // 일반회원으로 전환
                sql = 'UPDATE tbl_users SET pay_expire_time=NULL WHERE id="'+userId+'"';
                updateQuery(sql, function(result) {});
                // 
                sql = `UPDATE tbl_payment SET expire_time=NULL WHERE user_id="${userId}"`;
                updateQuery(sql, function(result) {});
            }
            // 
            callback(result);
        });
    };
    exports.updateByEmail = function(field, data, email, callback=()=>{}){
        callback = callback == null? nop:callback;
        if(!field) {
            callback(false);
            return;
        }
        var sql = 'UPDATE tbl_users SET '+field+'="'+data+'" WHERE email="'+email+'"';
        
        updateQuery(sql, function(result) {
            callback(result);
        });
    };
 
/********************Common*************************/
    // 
    exports.getTermById = function(data, callback){
        callback = callback == null? nop:callback;

        const {type} = data
        let sql = `SELECT * FROM tbl_terms WHERE id="${type}"`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    exports.getBadgeCnt = function(userId, callback){
        callback = callback == null? nop:callback;
        if(!userId) {
            callback({alarm_cnt: 0});  return;
        }
        let sql = `SELECT (SELECT COUNT(id) FROM tbl_alarm WHERE user_id="${userId}" AND read_flag=0) AS alarm_cnt `;
                    
        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    exports.addPushHistory = function(userId, type, title, content, target_id, callback=()=>{}){
        if(!userId || !content) {
            return;
        }
        
        let sql = `INSERT INTO tbl_alarm (user_id, target_id, type, title, content)  VALUES(?, ?, ?, ?, ?)`;
        let datas = [userId, target_id, type, title, content];
        insertQuery2(sql, datas, function (insertId) {
            callback(insertId);
        });
    };
    // notice alarm
    exports.getNoticePushUserList = function(lang, callback){
        callback = callback == null? nop:callback;

        let sql = 'SET group_concat_max_len=4294967295';
        getQuery(sql, function(rows) {
            sql = `SELECT group_concat(id) AS ids, GROUP_CONCAT(fcm_token) AS fcm_tokens FROM tbl_users WHERE lang="${lang}" AND SUBSTRING(alarm_flag, 11, 11)="1" AND status="N"`;
            getQuery(sql, function(rows) {
                callback(rows[0]);
            }); 
        }); 
    };
    exports.addNoticePushHistory = function(user_ids, title, content, target_id){
        if(!user_ids) {
            return;
        }
        let arr_userids = user_ids.split(',');
        let sql = `INSERT INTO tbl_alarm (user_id, target_id, type, title, content) VALUES`;
        for(let i in arr_userids) {
            sql += `("${arr_userids[i]}", "${target_id}", "5", "${title}", '${content}')`
            if(i == arr_userids.length - 1) {
                sql += ';';
            }
            else sql += ',';
        }
        insertQuery(sql, function (result) { });
    };

/********************Scheduler*************************/

    // 구독결제 정보
    exports.checkSubscribeTokens = function(callback){
        callback = callback == null? nop:callback;

        let sqlList = "SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));";
        sqlList += "SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));"; 
            
        exports.multi_query(sqlList, 2, function(ret) {
            if(ret != null) {   // 구독 상품 검증
                let sql = `SELECT id, user_id, amount, receipt, pay_type
                    FROM (SELECT id, user_id, amount, receipt, pay_type FROM tbl_payment WHERE purchase_state=0 AND pay_type <> "S" ORDER BY reg_time DESC LIMIT 100000) AS T GROUP BY user_id`;

                getQuery(sql, function(rows) {
                    callback(rows);
                });
            }
        });
    };
    exports.checkStripeSubscribe = function(callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT * FROM tbl_payment WHERE pay_type="S" AND purchase_state=0`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.checkVideoPostThumb = function(callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT id, vimeo_id FROM tbl_post WHERE imgs LIKE "%video/default%"`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.updatePayment = function(id, status, callback){
        callback = callback == null? nop:callback;
    
        let sql = `UPDATE tbl_payment SET purchase_state="${status}" WHERE id="${id}"`;
        updateQuery(sql, function(result) {});
        
        if(status == 1) {       // 구독 해지
            sql = `UPDATE tbl_payment SET expire_time=NULL WHERE id="${id}"`;
            updateQuery(sql, function(result) {});
        }
    };
    exports.updatePaymentExpireTime = function(id, time, callback){
        callback = callback == null? nop:callback;
    
        let sql = `UPDATE tbl_payment SET expire_time="${time}" WHERE id="${id}"`;
        updateQuery(sql, function(result) {});
    };
    // 구독 해지한 회원 > 일반회원으로
    exports.checkMemPaymentExpireTime = function(){
    
        let sql = `UPDATE tbl_payment SET purchase_state=1, expire_time=NULL WHERE expire_time<=NOW()`;
        updateQuery(sql, function(result) {});
        sql = `UPDATE tbl_users SET mem_type=1, pay_expire_time=NULL WHERE pay_expire_time<=NOW()`;
        updateQuery(sql, function(result) {});
    };
/********************Main*************************/
    // tmp
    exports.updateIntro = (userId, callback) => {
        callback = callback == null? nop:callback;
        if(!userId) {
            return callback(false);
        }

        if(id > 0) {    // update
            let sql = `UPDATE tbl_intro SET year="${year}", month='${month}', description='${description}' WHERE id="${id}"`;
            updateQuery(sql, function(result) {
                callback(result);
            });
        }
        else {
            let sql = `INSERT INTO tbl_intro( year, month, description) VALUES("${year}", "${month}", '${description}')`;
            insertQuery(sql, function (insertId) {
                callback(insertId);
            }); 
        }
    };
    exports.deleteIntro = function(data, callback){
        callback = callback == null? nop:callback;
        
        const {id} = data;

        let sql = `DELETE FROM tbl_intro WHERE id="${id}"`;
        delQuery(sql, function(result) {
            callback(result);
        });
    };
    // 
    exports.getCategoryList = function(callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT * FROM tbl_category ORDER BY sort ASC`;
        
        getQuery(sql, function(rows) {
            callback(rows);
        }); 
    };
    exports.getFollowing = function(userId, type, callback){
        callback = callback == null? nop:callback;
        if(!userId) {
            return callback([]);
        }

        let sql = `SELECT U.id, U.profile, U.nickname, U.email, F.id AS follow_id
                    FROM tbl_follow AS F 
                    LEFT JOIN tbl_users AS U ON U.id=F.target_id
                    WHERE U.status="N" AND user_id="${userId}" ORDER BY F.id DESC`;
        if(type == 'home') {
            sql += ' LIMIT 10';
        }
        getQuery(sql, function(rows) {
            if(type == 'home' && Boolean(userId)) {    // 방문자수 추가
                sql = `SELECT id FROM tbl_visitor WHERE user_id="${userId}" AND DATE_FORMAT(reg_time, "%Y-%m-%d")=CURDATE()`;
                getQuery(sql, function(result) {
                    if(!result[0]) {  // 당일 최초 방문
                        sql = `INSERT INTO tbl_visitor( user_id) VALUES("${userId}")`;
                        insertQuery(sql, function (insertId) {}); 
                    }
                }); 
            }
            // 
            callback(rows);
        }); 
    };
    // setting
    exports.getAppVersion = function(data, callback){
        callback = callback == null? nop:callback;

        const {platform} = data;
        
        let sql = `SELECT
                    (SELECT version FROM tbl_app_update WHERE platform="${platform}" AND forcible=1 ORDER BY id DESC LIMIT 1) AS version`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    // main
    const getPostSelectSql = (userId, main=false) => {
        userId = (userId == 'undefined' || !userId) ? '' : userId;
        let sql =  `
                (SELECT U.nickname FROM tbl_comment AS C LEFT JOIN tbl_users AS U ON U.id=C.user_id WHERE C.post_id = P.id AND C.likecnt >= (SELECT cmt_expocnt FROM tbl_setting) ORDER BY likecnt DESC LIMIT 1) AS cmt_nickname,
                (SELECT C.comment FROM tbl_comment AS C LEFT JOIN tbl_users AS U ON U.id=C.user_id WHERE C.post_id = P.id AND C.status IS NULL AND C.likecnt >= (SELECT cmt_expocnt FROM tbl_setting) ORDER BY likecnt DESC, C.reg_time DESC LIMIT 1) AS cmt, 

                (SELECT L.id FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=1 AND L.user_id="${userId}" LIMIT 1) AS like_id,
                (SELECT F.id FROM tbl_follow AS F WHERE P.user_id=F.target_id AND F.user_id="${userId}" LIMIT 1) AS follow_id,
                (SELECT B.id FROM tbl_bookmark AS B WHERE P.id=B.post_id AND B.type=1 AND B.user_id="${userId}" LIMIT 1) AS bookmark_id,`;

        if(main) {
            sql += `
                (SELECT COUNT(*) FROM tbl_share AS S WHERE P.id=S.post_id AND S.reg_date + INTERVAL 7 DAY >= CURDATE()) AS share_cnt2,
                (SELECT COUNT(*) FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=1 AND L.reg_date + INTERVAL 7 DAY >= CURDATE()) AS like_cnt2,
                (SELECT COUNT(*) FROM tbl_bookmark AS B WHERE P.id=B.post_id AND B.reg_date + INTERVAL 7 DAY >= CURDATE()) AS bookmark_cnt2,
                ((SELECT COUNT(*) FROM tbl_comment AS C WHERE P.id=C.post_id AND C.reg_time + INTERVAL 7 DAY >= NOW() AND C.status IS NULL) 
                    + 
                    (SELECT COUNT(*) FROM tbl_comment_re AS C LEFT JOIN tbl_comment AS MC ON MC.id=C.comment_id WHERE P.id=C.post_id AND C.reg_time + INTERVAL 7 DAY >= NOW() AND C.status IS NULL AND MC.status IS NULL)
                ) AS cmt_cnt2,
                (SELECT COUNT(*) FROM tbl_page_view AS PV WHERE P.id=PV.post_id AND PV.reg_date + INTERVAL 7 DAY >= CURDATE()) AS visit_cnt2,`;
        }
        sql += `
            (SELECT COUNT(*) FROM tbl_share AS S WHERE P.id=S.post_id) AS share_cnt,
            (SELECT COUNT(*) FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=1 ) AS like_cnt,
            (SELECT COUNT(*) FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=2 ) AS dislike_cnt,
            (SELECT COUNT(*) FROM tbl_bookmark AS B WHERE P.id=B.post_id) AS bookmark_cnt,
            ((SELECT COUNT(*) FROM tbl_comment AS C WHERE P.id=C.post_id AND C.status IS NULL) 
                + 
                (SELECT COUNT(*) FROM tbl_comment_re AS C LEFT JOIN tbl_comment AS MC ON MC.id=C.comment_id WHERE P.id=C.post_id AND C.status IS NULL AND MC.status IS NULL)
            ) AS cmt_cnt,
            (SELECT COUNT(*) FROM tbl_page_view AS PV WHERE P.id=PV.post_id) AS visit_cnt`;
        
        return sql;
    }
    exports.getMainDataByCategory = function(data, callback){
        callback = callback == null? nop:callback;

        const {category, itemCnt, order} = data;
        const userId = Boolean(data.userId) ? data.userId : ''
        let where = '1';
        let sort  = 'P.reg_time';
        if(order == 0) {     // PC에서 NEW아님
            sort  = 'share_cnt2 DESC, like_cnt2 DESC, bookmark_cnt2 DESC, cmt_cnt2 DESC, visit_cnt2 '; 
        }
        if (category == 0) {     // 인기순
            where = '1'; 
        }
        else {
            switch (category) {
                case 1: where = 'P.type=2'; break;     // Videos
                case 2: where = 'P.type=1 AND P.imgs<>""'; break;     // Photos
                case 3: where = 'P.type=3'; break;     // Chatgpt
                case 4: where = '((P.type=1 AND P.imgs="") OR P.type=4) '; break;     // Text
            }
        }
        if(userId) {
            where += ` AND isBlacklist("${userId}", P.user_id)=0`;
        }
        
        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        ${getPostSelectSql(userId, true)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 AND ${where} 
                        ORDER BY ${sort} DESC LIMIT ${itemCnt ? itemCnt : 0}, 15`;

        if(category == 5) { // following
            sql = `SELECT P.*, U.profile, U.nickname, U.email,
                    ${getPostSelectSql(userId, true)}
                    FROM tbl_post AS P
                    LEFT JOIN tbl_users AS U ON U.id=P.user_id
                    LEFT JOIN tbl_follow AS F ON F.target_id=P.user_id
                    WHERE P.status="N" AND P.hide=0 AND F.user_id="${userId}" AND P.user_id<>"${userId}" 
                    ORDER BY P.reg_time DESC LIMIT ${itemCnt ? itemCnt : 0}, 15`;
        }
        
        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    // update following
    exports.updateFollowing = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, user_id, follow_id} = data;

        if(follow_id) {    // delete
            let sql = `DELETE FROM tbl_follow WHERE id="${follow_id}"`;
            delQuery(sql, function(result) {
                callback(result);
            });
        }
        else {
            let sql = `DELETE FROM tbl_follow WHERE user_id="${userId}" AND target_id="${user_id}"`;
            delQuery(sql, function(result) {
                sql = `INSERT INTO tbl_follow( user_id, target_id) VALUES("${userId}", "${user_id}")`;
                insertQuery(sql, function (insertId) {
                    // send Push //// 새로운 구독자
                    exports.getUserInfoById(userId, function(result) {
                        if(result) {
                            const content = `${result.nickname}님이 나를 팔로우하셨습니다.`;
                            fcm.sendPushByUserId(user_id, 0, content, userId);
                        }
                    }); 
                    // 
                    callback(insertId);
                });
            }); 
        }
    };
    exports.updateBookmark = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, id, bookmark_id, type, thumb, prompt, prompt_idx} = data;

        if(bookmark_id) {    // delete
            let sql = `DELETE FROM tbl_bookmark WHERE id="${bookmark_id}"`;
            delQuery(sql, function(result) {
                callback(result);
            });
        }
        else {
            // let sql = `INSERT INTO tbl_bookmark( user_id, post_id, type, prompt, prompt_idx, thumb, reg_date) 
            //             VALUES("${userId}", "${id}", "${type}", '${prompt ? prompt : ''}', "${prompt_idx ? prompt_idx : 0}", "${thumb}", CURDATE())`;
            // insertQuery(sql, function (insertId) {
            //     callback(insertId);
            // }); 

            let sql = `INSERT INTO tbl_bookmark( user_id, post_id, type, prompt, prompt_idx, thumb, reg_date) 
                    VALUES(?, ?, ?, ?, ?, ?, CURDATE())`;
            let datas = [userId, id, type, prompt ? prompt : '', prompt_idx ? prompt_idx : 0, thumb];
            insertQuery2(sql, datas, function (insertId) {
                callback(insertId);
            }); 
        }
    };
    // post detail
    exports.getPostDetail = function(data, callback){
        callback = callback == null? nop:callback;

        const {postId, userId} = data;
        
        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        (SELECT U.profile FROM tbl_comment AS C LEFT JOIN tbl_users AS U ON U.id=C.user_id WHERE C.post_id = P.id ORDER BY likecnt DESC, C.reg_time DESC LIMIT 1) AS cmt_profile2, 
                        (SELECT C.comment FROM tbl_comment AS C LEFT JOIN tbl_users AS U ON U.id=C.user_id WHERE C.post_id = P.id AND C.status IS NULL ORDER BY likecnt DESC, C.reg_time DESC, C.reg_time DESC LIMIT 1) AS cmt2, 
                        
                        (SELECT L.id FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=1 AND L.user_id="${userId}" LIMIT 1) AS like_id,
                        (SELECT L.id FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=2 AND L.user_id="${userId}" LIMIT 1) AS dislike_id,
                        ${getPostSelectSql(userId)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 AND P.id="${postId}" AND isBlacklist("${userId}", P.user_id)=0 `;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    exports.getPostPromptBookmark = function(data, callback){
        callback = callback == null? nop:callback;

        const {postId, userId} = data;
        
        let sql = `SELECT B.id, B.prompt_idx, B.prompt FROM tbl_bookmark AS B WHERE B.post_id="${postId}" AND B.type=2 AND B.user_id="${userId}"`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.addPostView = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {postId, stayTime} = data;

        let sql = `INSERT INTO tbl_page_view( post_id, stay_time, reg_date) VALUES("${postId}", "${stayTime}", CURDATE())`;
        
        insertQuery(sql, function (insertId) {
            sql = `UPDATE tbl_post SET hits=hits+1 WHERE id="${postId}"`;
            updateQuery(sql, function(result) {});
            // 
            callback(insertId);
        }); 
    };
    // 상세 댓글목록
    exports.getPostComments = function(data, callback){
        callback = callback == null? nop:callback;

        const {postId, userId} = data;
        
        let sql = `SELECT C.*, U.profile, U.nickname, U.email,
                        (SELECT COUNT(*) FROM tbl_like AS L WHERE L.target_id=C.id AND L.type=2 AND L.like=1) AS like_cnt,
                        (SELECT COUNT(*) FROM tbl_comment_re AS CR WHERE CR.comment_id=C.id) AS cmt_cnt,
                        (SELECT L.id FROM tbl_like AS L WHERE C.id=L.target_id AND L.type=2 AND L.like=1 AND L.user_id="${userId}") AS like_id
                        FROM tbl_comment AS C
                        LEFT JOIN tbl_users AS U ON U.id=C.user_id
                        WHERE C.post_id="${postId}" AND isBlacklist("${userId}", C.user_id)=0 ORDER BY C.reg_time DESC`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getPostReComments = function(data, callback){
        callback = callback == null? nop:callback;

        const {postId, userId} = data;
        
        let sql = `SELECT C.*, U.profile, U.nickname, U.email,
                        (SELECT nickname FROM tbl_users AS U WHERE U.id=(SELECT user_id FROM tbl_comment_re AS CR WHERE CR.id=C.comment_id2)) AS nickname2,
                        (SELECT COUNT(*) FROM tbl_comment_re AS CR WHERE C.id=CR.comment_id2) AS cmt_cnt,
                        (SELECT COUNT(*) FROM tbl_like AS L WHERE L.target_id=C.id AND L.type=3 AND L.like=1) AS like_cnt,
                        (SELECT L.id FROM tbl_like AS L WHERE C.id=L.target_id AND L.type=3 AND L.like=1 AND L.user_id="${userId}") AS like_id
                        FROM tbl_comment_re AS C
                        LEFT JOIN tbl_users AS U ON U.id=C.user_id
                        WHERE C.post_id="${postId}" AND isBlacklist("${userId}", C.user_id)=0 `;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    // 상세에서 게시물 추천
    exports.getPostRecommend = function(data, callback){
        callback = callback == null? nop:callback;

        const shuffle = array =>
            array
            // Generate a random number for each elements
            .map(value => [Math.random(), value])
            // Sort using each element random number
            .sort(([a], [b]) => a - b)
            // Return back to an array of values
            .map(entry => entry[1]);

        const {postId, userId} = data;
        const sort  = 'share_cnt DESC, like_cnt DESC, bookmark_cnt DESC, cmt_cnt DESC, visit_cnt '; 
        
        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        ${getPostSelectSql(userId)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 AND P.id<>"${postId}" AND isBlacklist("${userId}", P.user_id)=0 ORDER BY ${sort} DESC LIMIT 100 `;

        getQuery(sql, function(rows) {
            let datas = shuffle(rows).slice(0,3);
            callback(datas);
        });
    };
    exports.deletePost = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, id} = data;

        let sql = `UPDATE tbl_post SET status="D" WHERE id="${id}"`;
        updateQuery(sql, function(result) {
            callback(result);
        });
    };
    exports.addReport = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, user_id, id, type, reason, reason_txt, recmt} = data;

        let sql = `INSERT INTO tbl_report( user_id, user_id2, target_id, type, recmt, reason, reason_txt) 
                    VALUES("${userId ? userId : 0}", "${user_id}", "${id}", "${type}", "${recmt ? 1 : 0}", "${reason}", '${reason_txt}')`;
        insertQuery(sql, function (insertId) {
            callback(insertId);
        }); 
    };
    exports.addBlacklist = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, user_id} = data;

        let sql = `INSERT INTO tbl_blacklist( user_id, target_id) VALUES("${userId}", "${user_id}")`;
        insertQuery(sql, function (insertId) {
            callback(insertId);
        }); 
    };
    exports.addShare = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, id} = data;

        let sql = `INSERT INTO tbl_share( user_id, post_id, reg_date) VALUES("${userId}", "${id}", CURDATE())`;
        insertQuery(sql, function (insertId) {
            callback(insertId);
        }); 
    };
    exports.updateLike = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, id, like_id, dislike_id, type, like} = data;

        if(type == 2) {     // 댓글 좋아요
            let sql2 = `UPDATE tbl_comment SET likecnt=likecnt ${like_id ? '-1' : '+1'} WHERE id="${id}"`;
            updateQuery(sql2, function(result) {});
        }
        if(like_id || dislike_id) {    // delete
            const likeId = like_id ? like_id : dislike_id;
            let sql = `DELETE FROM tbl_like WHERE id="${likeId}"`;
            delQuery(sql, function(result) {
                // callback(result);
            });
        }
        if((!like_id && !dislike_id) || (!like_id && like == 1) || (!dislike_id && like == 2)) {

            let sql = 'INSERT INTO tbl_like( user_id, target_id, `type`, `like`, reg_date) VALUES("'+userId+'", "'+id+'", "'+type+'", "'+like+'", CURDATE())';
            insertQuery(sql, function (insertId) {

                // send Push //// 내 게시물에 좋아요
                if(like == 1 && type == 1) {    // 포스팅에 대한 좋아요
                    exports.getUserInfoById(userId, function(result) {
                        if(result) {
                            sql = `SELECT user_id FROM tbl_post WHERE id="${id}"`;
                            getQuery(sql, function(rows) {
                                if(rows[0]) {
                                    const {user_id} = rows[0];
                                    if(userId != user_id) {     // 본인 아님
                                        const content = `${result.nickname}님이 나의 게시물을 좋아요 하였습니다.`;
                                        fcm.sendPushByUserId(user_id, 3, content, id);
                                    }
                                }
                            });
                        }
                    }); 
                }
                callback(insertId);
            }); 
        }
        else {
            callback(true);
        }
    };
    // @nickname 언급된 닉네임에게 새 댓글 알림
    const sendAlarmMentionCmt = (nicknames, nickname, comment, userId, postId) => {
        
        let sql = `SELECT id AS user_id, nickname FROM tbl_users WHERE FIND_IN_SET(nickname, '${nicknames}')`;

        getQuery(sql, function(rows) {
            if(rows) {
                let arrFunctions = [];
                let callbackFn = function(userData) {
                    const {user_id} = userData;
                    return function (cb) {
                        if(userId != user_id) {     // 본인 아님
                            const content = `${nickname}님이 댓글에서 회원님을 언급했습니다. !~#@"${comment}"`;
                            fcm.sendPushByUserId(user_id, 6, content, postId, ()=>{}, 2);
                        }
                        cb(null, true);
                    };
                }
                for(let i in rows) {
                    arrFunctions.push(callbackFn(rows[i]));
                }
                async.parallel(
                    arrFunctions,
                    function(err, rst) {}
                );
            }
        });
    }
    exports.addComment = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, cmtId, postId, comment, commentId, commentId2, cmtType, nicknames} = data;

        let sql = '';
        if(cmtId) {     // update
            const table = cmtType == 2 ? 'tbl_comment' : 'tbl_comment_re';
    
            let sql = `UPDATE ${table} SET comment=? WHERE id="${cmtId}"`;
            let datas = [comment];
            updateQuery2(sql, datas, function(result) {
                callback(result);
            });
        }
        else {
            let datas = [];
            if(cmtType == 1) {  // 게시물에 댓글
                sql = `INSERT INTO tbl_comment( user_id, post_id, comment) VALUES(?, ?, ?)`;
                datas = [userId, postId, comment];
            }
            else {    // commentId2 값이 있으면, 대댓글에 대한 댓글
                sql = `INSERT INTO tbl_comment_re( user_id, post_id, comment_id, comment_id2, comment) VALUES(?, ?, ?, ?, ?)`;
                datas = [userId, postId, commentId, commentId2, comment];
            }
            insertQuery2(sql, datas, function (insertId) {

                // send Push //// 내 게시물에 댓글 & 내 댓글에 답글
                exports.getUserInfoById(userId, function(result) {
                    if(result) {
                        const {nickname} = result;
                        // @멘션 유저에게 알림발송
                        if(nicknames) {
                            sendAlarmMentionCmt(nicknames, nickname, comment, userId, postId);
                        }

                        if(cmtType == 1) {  // 내 게시물에 댓글
                            sql = `SELECT user_id FROM tbl_post WHERE id="${postId}"`;
                            getQuery(sql, function(rows) {
                                if(rows[0]) {
                                    const {user_id} = rows[0];
                                    if(userId != user_id) {     // 본인 아님
                                        const content = `${nickname}님이 나의 게시물에 댓글을 달았습니다. !~#@"${comment}"`;
                                        fcm.sendPushByUserId(user_id, 2, content, postId);
                                    }
                                }
                            });
                            // 
                        }
                        else {  // 내 댓글에 답글
                            sql = `SELECT user_id FROM tbl_comment WHERE id="${commentId}"`;
                            getQuery(sql, function(rows) {
                                if(rows[0]) {
                                    const {user_id} = rows[0];
                                    if(userId != user_id) {     // 본인 아님
                                        const content = `${nickname}님이 나의 댓글에 대댓글을 달았습니다. !~#@"${comment}"`;
                                        fcm.sendPushByUserId(user_id, 4, content, postId);
                                    }
                                }
                            });

                            // 내 게시물에 대댓글
                            sql = `SELECT user_id FROM tbl_post WHERE id="${postId}"`;
                            getQuery(sql, function(rows) {
                                if(rows[0]) {
                                    const {user_id} = rows[0];
                                    if(userId != user_id) {     // 본인 아님
                                        const content = `${nickname}님이 나의 게시물에 댓글을 달았습니다. !~#@"${comment}"`;
                                        fcm.sendPushByUserId(user_id, 2, content, postId);
                                    }
                                }
                            });
                        }
                    }
                }); 
                // 
                callback(insertId);
            }); 
        }
    };
    exports.deleteCmt = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, id, cmtType} = data;
        const table = cmtType == 2 ? 'tbl_comment' : 'tbl_comment_re';

        let sql = `UPDATE ${table} SET status="D" WHERE id="${id}"`;
        updateQuery(sql, function(result) {
            callback(result);
        });
    };
    // register post
    exports.getPostData = function(data, callback){
        callback = callback == null? nop:callback;

        const {postId, userId} = data;
        
        let sql = `SELECT * FROM tbl_post WHERE status="N" AND hide=0 AND id="${postId}" AND user_id="${userId}"`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    // send Push //// 새로운 게시물
    const sendAlarmNewPosting = (userId, target_id) => {
        
        async.waterfall([
            function(callback) {
                exports.getUserInfoById(userId, function(result) {
                    callback(null, result?.nickname);
                }); 
            },
            function(nickname, callback) {
                let sql = `SELECT user_id FROM tbl_follow WHERE target_id="${userId}"`;

                getQuery(sql, function(rows) {
                    callback(null, rows, nickname);
                });
            },
            function(rows, nickname, callback) {
                // 
                let arrFunctions = [];
                let callbackFn = function(user_id) {
                    return function (cb) {
                        const content = `${nickname}님이 새로운 게시물을 등록했습니다.`;
                        fcm.sendPushByUserId(user_id, 1, content, target_id);
                        cb(null);
                    };
                }
                for (let i = 0; i < rows.length; i++) {
                    const {user_id} = rows[i];
                    arrFunctions.push(callbackFn(user_id));
                }
                async.parallel(
                    arrFunctions,
                    function(err, rst) { }
                );
                callback(null);
            }
        ], function (err, result) {
            //
        }); 
    }
    // @nickname 게시물에서 언급된 회원에게 알림
    const sendAlarmMentionPosting = (nicknames, userId, target_id) => {
        
        async.waterfall([
            function(callback) {
                exports.getUserInfoById(userId, function(result) {
                    callback(null, result?.nickname);
                }); 
            },
            function(nickname, callback) {

                let sql = `SELECT id AS user_id FROM tbl_users WHERE FIND_IN_SET(nickname, '${nicknames}')`;

                getQuery(sql, function(rows) {
                    if(rows) {
                        let arrFunctions = [];
                        let callbackFn = function(userData) {
                            const {user_id} = userData;
                            return function (cb) {
                                const content = `${nickname}님이 게시물에서 회원님을 언급했습니다.`;
                                fcm.sendPushByUserId(user_id, 6, content, target_id, ()=>{}, 1);
                                cb(null, true);
                            };
                        }
                        for(let i in rows) {
                            arrFunctions.push(callbackFn(rows[i]));
                        }
                        async.parallel(
                            arrFunctions,
                            function(err, rst) {
                                callback(false, true);
                            }
                        );
                    }
                });
            }
        ], function (err, result) {
            //
        }); 
    }
    exports.updatePost = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, postId, type, title, content, prompt, tags, nicknames, imgs, video_size, video_duration} = data;

        if(postId > 0) {    // update
            let sql = `UPDATE tbl_post SET type=?, title=?, content=?, tags=?, nicknames=?, prompt=?, imgs=?, video_size=?, video_duration=? WHERE id="${postId}"`;
            let datas = [type, title, content, (tags ? tags : ''), (nicknames ? nicknames : ''), prompt, imgs, video_size, video_duration];
            updateQuery2(sql, datas, function(result) {
                callback(result);
            });
        }
        else {
            let sql = `INSERT INTO tbl_post( user_id, type, title, content, tags, nicknames, prompt, imgs, video_size, video_duration, status) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            let datas = [userId, type, title, content, (tags ? tags : ''), (nicknames ? nicknames : ''), prompt, imgs, video_size, video_duration, type == 2 ? "L" : "N"];
            insertQuery2(sql, datas, function (insertId) {
                if(type != 2) { // 이미지 & 텍스트 일때는 바로 알림 - 동영상은 업로드 완성후 알림
                    sendAlarmNewPosting(userId, insertId);

                    if(nicknames) {     // @닉네임 들에게 알림발송
                        sendAlarmMentionPosting(nicknames, userId, insertId);
                    }
                }
                // 
                callback(insertId);
            }); 
        }
    };
    exports.updateVimeoStatus = function(postId, uri){
    
        let sql = `UPDATE tbl_post SET vimeo_id="${uri}", status="N" WHERE id="${postId}"`;
        updateQuery(sql, function(result) {

            // 동영상은 업로드 완성후 알림
            sql = `SELECT user_id FROM tbl_post WHERE id="${postId}"`;
            getQuery(sql, function(rows) {
                const userId = rows[0]?.user_id;
                // sendAlarmNewPosting(userId, postId);
            });
        });
    };
    exports.updateVimeoContents = function(data){

        const {postId, duration, thumb} = data;
        let sql = `UPDATE tbl_post SET video_duration="${duration}", imgs="${thumb}" WHERE id="${postId}"`;
        updateQuery(sql, function(result) {});
    };
    exports.updateChatGPTPost = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, postId, title, content, nicknames, chatgpt_url, chatgptHtml} = data;

        if(postId > 0) {    // update
            let sql = `UPDATE tbl_post SET title=?, content=?, chatgpt_url=?, chatgpt=? WHERE id="${postId}"`;
            let datas = [title, content, chatgpt_url, chatgptHtml];
            updateQuery2(sql, datas, function(result) {
                callback(result);
            });
        }
        else {
            let sql = `INSERT INTO tbl_post( user_id, type, title, content, chatgpt_url, chatgpt, status) VALUES(?, ?, ?, ?, ?, ?, "N")`;
            let datas = [userId, 3, title, content, chatgpt_url, chatgptHtml];
            insertQuery2(sql, datas, function (insertId) {
                // send alarm
                sendAlarmNewPosting(userId, insertId);
                if(nicknames) {     // @닉네임 들에게 알림발송
                    sendAlarmMentionPosting(nicknames, userId, insertId);
                }
                // 
                callback(insertId);
            }); 
        }
    };
    // aigee
    exports.getAigees = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId} = data;
        let sort  = 'share_cnt DESC, cmt_cnt DESC, like_cnt DESC, P.hits DESC, video_duration DESC, P.reg_time DESC ';
        
        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        (SELECT L.id FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=1 AND L.user_id="${userId}" LIMIT 1) AS like_id,
                        (SELECT L.id FROM tbl_like AS L WHERE P.id=L.target_id AND L.type=1 AND L.like=2 AND L.user_id="${userId}" LIMIT 1) AS dislike_id,
                        ${getPostSelectSql(userId)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 AND P.type=2 AND isBlacklist("${userId}", P.user_id)=0 `;
        sql += ` ORDER BY ${sort} LIMIT 200`;
        
        getQuery(sql, function(list) {
            // get relations comments
            if(list.length == 0) {
                return callback([]);
            }
            // 
            let arrFunctions = [];
            let callbackFn = function(postData) {
                const {id} = postData;
                const fields = {postId: id, userId};
                return function (cb) {
                    async.waterfall([
                        function(callback) {
                            exports.getPostComments(fields, function(result) {
                                postData.cmtList = result;
                                callback(null);
                            });
                        },
                        function(callback) {
                            exports.getPostReComments(fields, function(result) {
                                postData.cmtReList = result;
                                callback(null);
                            });
                        }
                    ], function (err, result) {
                        cb(null, postData);
                    });
                };
            }
            for(let i in list) {
                arrFunctions.push(callbackFn(list[i]));
            }
            async.parallel(
                arrFunctions,
                function(err, rst) { 
                    callback(rst);
                }
            );
        });
    };
    // search
    exports.getKeywords = function(type, callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT keyword, COUNT(DISTINCT id) AS cnt FROM tbl_keywords WHERE reg_date=CURDATE() GROUP BY keyword ORDER BY cnt DESC LIMIT 10`;
        if(type == 'all') {
            sql = `SELECT keyword, COUNT(DISTINCT id) AS cnt FROM tbl_keywords WHERE reg_date<>CURDATE() GROUP BY keyword ORDER BY cnt DESC LIMIT 10`;
        }

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getSearchData = function(data, callback){
        callback = callback == null? nop:callback;

        const {keyword, tag, tabindex, lastPostId, itemCnt, userId} = data;
        // 
        let where = `1`;
        let sort  = 'P.reg_time';

        if(Boolean(keyword)) {
            where = `(UPPER(P.title) LIKE UPPER("%${keyword}%") OR UPPER(P.content) LIKE UPPER("%${keyword}%") OR UPPER(P.prompt) LIKE UPPER("%${keyword}%") OR UPPER(P.chatgpt) LIKE UPPER("%${keyword}%"))`;
            // insert keyword
            let sql2 = `INSERT INTO tbl_keywords( keyword, reg_date) VALUES("${keyword}", CURDATE())`;
            insertQuery(sql2, function (insertId) {}); 
        }
        // 
        if (tabindex < 4) {     // post
            if(Boolean(tag)) {
                where = `(P.tags LIKE "%${tag}%")`;
            }

            if (tabindex == 0) {     // all
                
            }
            else if (tabindex == 1) {     // video
                where += ' AND P.type=2'; 
            }
            else if (tabindex == 2) {     // chatgpt
                where += ' AND P.type=3'; 
            }
            else if (tabindex == 3) {     // community
                where += ' AND ((P.type=1 AND P.imgs="") OR P.type=4) ';
            }
            if(userId) {
                where += ` AND isBlacklist("${userId}", P.user_id)=0`;
            }
            
            let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                            ${getPostSelectSql(userId, true)}
                            FROM tbl_post AS P
                            LEFT JOIN tbl_users AS U ON U.id=P.user_id
                            WHERE P.status="N" AND P.hide=0 AND ${where} 
                            ORDER BY ${sort} DESC LIMIT ${itemCnt ? itemCnt : 0}, 15`;
                
            getQuery(sql, function(rows) {
                callback(rows);
            });
        }
        else if(tabindex == 4) {  // tag

            // let sql = `SELECT GROUP_CONCAT(tags) AS tags FROM tbl_post AS P WHERE tags<>"" AND status="N" AND hide=0 AND ${where} ORDER BY reg_time DESC LIMIT 200`;
            where = `UPPER(P.tags) LIKE UPPER("%${keyword}%")`;
            let sql = `SELECT tags FROM tbl_post AS P WHERE tags<>"" AND status="N" AND hide=0 AND ${where} ORDER BY reg_time DESC LIMIT 200`;
            
            getQuery(sql, function(rows) {
                let result = '';
                if(rows) {
                    result = rows.map(dt => dt.tags).join();
                }
                callback({tags: result});
            });
        }
        else if(tabindex == 5) {  // people
            where = `id<>"${userId}"`;
            if(Boolean(keyword)) {
                where += ` AND (email LIKE "%${keyword}%" OR nickname LIKE "%${keyword}%" OR intro LIKE "%${keyword}%")`;
            }

            let sql = `SELECT id, nickname, profile, @rownum:=@rownum+1 AS idx,
                        (SELECT COUNT(*) FROM tbl_follow AS F WHERE F.target_id=U.id) AS follow_cnt,
                        (SELECT F.id FROM tbl_follow AS F WHERE U.id=F.target_id AND F.user_id="${userId}") AS follow_id
                        FROM tbl_users AS U 
                        CROSS JOIN (SELECT @rownum:=0) AS user_init
                        WHERE U.status="N" AND ${where}  
                        ORDER BY follow_cnt DESC LIMIT ${itemCnt}, 30`;
    
            // pagenation
            // if(!lastPostId) {
            //     sql += ` ORDER BY follow_cnt DESC LIMIT 30`;
            // }
            // else {
            //     sql += ` AND idx < "${lastPostId}" ORDER BY follow_cnt DESC LIMIT 30`;
            // }
            
            getQuery(sql, function(rows) {
                callback(rows);
            });
        }
    };
    // bookmark
    exports.getFolders = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId} = data;
        
        let sql = `SELECT * FROM tbl_folder WHERE user_id="${userId}" ORDER BY id DESC`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getMyBookmarks = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, type} = data;
        
        let sql = `SELECT B.*, P.title
                    FROM tbl_bookmark AS B 
                    LEFT JOIN tbl_post AS P ON P.id=B.post_id
                    WHERE P.status="N" AND P.hide=0 AND B.type=${type} AND B.user_id="${userId}" ORDER BY B.id DESC`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getBookmarkByFId = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, folderId, type} = data;
        
        let sql = '';
        if(folderId == -1) {
            sql = `SELECT B.*, P.title
                    FROM tbl_bookmark AS B 
                    LEFT JOIN tbl_post AS P ON P.id=B.post_id
                    WHERE P.status="N" AND P.hide=0 AND B.type=${type} AND B.user_id="${userId}" ORDER BY B.id DESC`;
        }
        else {
            sql = `SELECT B.*, P.title
                    FROM tbl_bookmark AS B 
                    LEFT JOIN tbl_post AS P ON P.id=B.post_id
                    WHERE P.status="N" AND P.hide=0 AND 
                    FIND_IN_SET(B.id, 
                        (SELECT book_ids FROM tbl_folder WHERE user_id="${userId}" AND id="${folderId}" )
                    )
                    ORDER BY B.id DESC`;
        }

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getFolderInfoById = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, folderId} = data;
        
        let sql = `SELECT * FROM tbl_folder WHERE user_id="${userId}" AND id="${folderId}"`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    exports.getBookmarksUnFoldered = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, folderId, type} = data;
        
        let sql = `SELECT B.*, P.title
                    FROM tbl_bookmark AS B 
                    LEFT JOIN tbl_post AS P ON P.id=B.post_id
                    WHERE P.status="N" AND P.hide=0 AND B.user_id="${userId}" AND B.type="${type}" 
                    ORDER BY B.id DESC`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.updateFolder = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, folderId, type, book_ids, folder_name} = data;

        if(folderId > 0) {    // update
            let sql = `UPDATE tbl_folder SET id="${folderId}"`;
            if(folder_name) {
                sql += `, folder_name="${replaceQuotes(folder_name)}"`;
            }
            if(book_ids) {
                sql += `, book_ids="${book_ids}"`;
            }
            sql += ` WHERE id="${folderId}"`;
            updateQuery(sql, function(result) {
                callback(result);
            });
        }
        else {
            let sql = `INSERT INTO tbl_folder( user_id, type, folder_name, book_ids) VALUES(?, ?, ?, ?)`;
            let datas = [userId, type, folder_name, book_ids];
            insertQuery2(sql, datas, function (insertId) {
                callback(insertId);
            }); 
        }
    };
    exports.deleteFolder = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {folderId, userId} = data;

        let sql = `DELETE FROM tbl_folder WHERE id="${folderId}" AND user_id="${userId}"`;
        delQuery(sql, function(result) {
            callback(result);
        });
    };
    // setting
    exports.getMyInfo = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, user_id, platform} = data;
        const memberId = user_id ? user_id : userId;
        
        let sql = `SELECT id, mem_type, reg_type, email, nickname, profile, intro, alarm_flag, marketing,
                    (SELECT version FROM tbl_app_update WHERE platform="${platform}" ORDER BY id DESC LIMIT 1) AS version,
                    (SELECT COUNT(*) FROM tbl_post AS P WHERE P.user_id=U.id AND P.status="N" AND P.hide=0) AS post_cnt,
                    (SELECT COUNT(*) FROM tbl_follow AS F LEFT JOIN tbl_users AS U1 ON U1.id=F.target_id WHERE U1.status="N" AND F.user_id=U.id AND F.target_id>0) AS following_cnt,
                    (SELECT COUNT(*) FROM tbl_follow AS F LEFT JOIN tbl_users AS U1 ON U1.id=F.user_id WHERE U1.status="N" AND F.target_id=U.id AND F.target_id>0) AS follower_cnt,
                    (SELECT F.id FROM tbl_follow AS F WHERE F.target_id=U.id AND F.user_id="${userId}") AS follow_id,
                    (SELECT COUNT(*) FROM tbl_payment AS P WHERE P.user_id=U.id AND purchase_state=1 LIMIT 1) AS payed
                    FROM tbl_users AS U
                    WHERE id="${memberId}"`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };
    exports.getNotice = function(data, callback){
        callback = callback == null? nop:callback;

        const {i18nextLng} = data;
        
        let sql = `SELECT * FROM tbl_notice WHERE title_${i18nextLng}<>"" AND content_${i18nextLng}<>"" ORDER BY reg_time DESC`;
        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getNoticeById = function(data, callback){
        callback = callback == null? nop:callback;

        const {id} = data;
        
        let sql = `SELECT * FROM tbl_notice WHERE id="${id}"`;
        getQuery(sql, function(rows) {
            sql = `UPDATE tbl_notice SET hits=hits+1 WHERE id="${id}"`;
            updateQuery(sql, function(result) {});
            // 
            callback(rows[0]);
        });
    };
    exports.memberExit = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId} = data;

        let sql = `UPDATE tbl_users SET status="E", login_flag=0, fcm_token="", exit_time=NOW() WHERE id="${userId}"`;
        updateQuery(sql, function(result) {
            callback(result);
        });
    };
    // type == 1 ? '좋아요 게시물' : '댓글단 게시물' 
    exports.getMyContents = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, type} = data;
        
        if(type == 1) {
            let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                            ${getPostSelectSql(userId)}
                            FROM tbl_like AS L
                            LEFT JOIN tbl_post AS P ON L.target_id=P.id
                            LEFT JOIN tbl_users AS U ON U.id=P.user_id
                            WHERE P.status="N" AND P.hide=0 AND L.type=1 AND L.like=1 AND L.user_id="${userId}" GROUP BY P.id ORDER BY L.reg_date DESC `;
    
            getQuery(sql, function(rows) {
                callback(rows);
            });
        }
        else {
            let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                            ${getPostSelectSql(userId)}
                            FROM tbl_post AS P
                            LEFT JOIN tbl_comment AS C ON C.post_id=P.id
                            LEFT JOIN tbl_comment_re AS CR ON CR.comment_id=C.id
                            LEFT JOIN tbl_users AS U ON U.id=P.user_id
                            WHERE P.status="N" AND P.hide=0 AND C.status IS NULL AND (C.user_id="${userId}" OR CR.user_id="${userId}") GROUP BY P.id ORDER BY C.reg_time DESC, CR.reg_time DESC `;
    
            getQuery(sql, function(rows) {
                callback(rows);
            });
        }
    };
    exports.getBlackList = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId} = data;
        let sql = `SELECT B.id, B.target_id, nickname, profile
                    FROM tbl_blacklist AS B
                    LEFT JOIN tbl_users AS U ON B.target_id=U.id
                    WHERE U.status="N" AND B.user_id="${userId}" ORDER BY B.id DESC `;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.updateBlackList = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, user_id, black_id} = data;

        if(black_id) {    // delete
            let sql = `DELETE FROM tbl_blacklist WHERE id="${black_id}"`;
            delQuery(sql, function(result) {
                callback(result);
            });
        }
        else {
            let sql = 'INSERT INTO tbl_blacklist( user_id, target_id) VALUES("'+userId+'", "'+user_id+'")';
            insertQuery(sql, function (insertId) {
                callback(insertId);
            }); 
        }
    };
    exports.getFaqKinds = function(callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT * FROM tbl_faq_kind ORDER BY sort ASC`;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.getFaqs = function(callback){
        callback = callback == null? nop:callback;

        let sql = `SELECT F.*, FK.kind_ko, FK.kind_en, FK.kind_hi, FK.kind_pt, FK.kind_es
                    FROM tbl_faq AS F 
                    LEFT JOIN tbl_faq_kind AS FK ON FK.id=F.faq_kind_id
                    ORDER BY reg_time DESC `;

        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    exports.setFaqHits = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, faq_id} = data;

        let sql = `UPDATE tbl_faq SET hits=hits+1 WHERE id="${faq_id}"`;
        updateQuery(sql, function(result) {
            callback(result);
        });
    };
    // sendImprove
    exports.sendImprove = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, content} = data;

        let sql = 'INSERT INTO tbl_improve( user_id, content) VALUES("'+userId+'", "'+content+'")';
        insertQuery(sql, function (insertId) {
            callback(insertId);
        }); 
    };
    // mypage
    exports.getMyPosts = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, type, id} = data;
        const sort = ' P.reg_time ';
        let where = `P.user_id="${userId}"`;
        if(type == 1) {
            where += ` AND P.type=2`;
        }
        if(type == 2) { // images
            where += ` AND P.type=1 AND P.imgs<>""`;
        }
        if(type == 3) { // text
            where += ` AND ((P.type=1 AND P.imgs="") OR P.type=3)`;
        }
        if(Boolean(type)) {
            where += ` AND P.status="N"`;
        }

        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        ${getPostSelectSql(userId)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.hide=0 AND P.status<>"D" AND ${where} `;

        // pagenation
        if(id) {
            sql += ` AND P.id <= "${id}" `;
        }
        sql += ` GROUP BY P.id ORDER BY ${sort} DESC`;
        
        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    // alarm
    exports.getAlarmList = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId} = data;
        let sql = `SELECT * FROM tbl_alarm WHERE user_id="${userId}" ORDER BY reg_time DESC `;

        getQuery(sql, function(rows) {
            sql = `UPDATE tbl_alarm SET read_flag="1" WHERE user_id="${userId}"`;
            updateQuery(sql, function(result) {});
            // 
            callback(rows);
        });
    };
    exports.delAlarm = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, alarm_id} = data;

        let sql = '';
        if(alarm_id) {    // one delete
            sql = `DELETE FROM tbl_alarm WHERE id="${alarm_id}"`;
        }
        else {  // all delete
            sql = `DELETE FROM tbl_alarm WHERE user_id="${userId}"`;
        }
        
        delQuery(sql, function(result) {
            callback(result);
        });
    };
    // profile
    exports.getUserPosts = function(data, callback){
        callback = callback == null? nop:callback;

        const {userId, user_id, type, id, keyword} = data;
        const sort = ' P.reg_time ';
        let where = `P.user_id="${user_id}"`;
        if(type == 1) {
            where += ` AND P.type=2`;
        }
        if(type == 2) { // images
            where += ` AND P.type=1 AND P.imgs<>""`;
        }
        if(type == 3) { // text
            where += ` AND ((P.type=1 AND P.imgs="") OR P.type=3)`;
        }
        if(Boolean(type)) {
            where += ` AND P.status="N"`;
        }
        // 
        if(Boolean(keyword)) {
            where += ` AND (P.title LIKE "%${keyword}%" OR P.content LIKE "%${keyword}%" OR P.prompt LIKE "%${keyword}%" OR P.chatgpt LIKE "%${keyword}%")`;
        }

        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        ${getPostSelectSql(userId)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 AND ${where} `;

        // pagenation
        if(id) {
            sql += ` AND P.id <= "${id}" `;
        }
        sql += ` ORDER BY ${sort} DESC`;
        
        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    // my followers
    exports.getMyFollowers = function(data, callback){
        callback = callback == null? nop:callback;
        if(!data) {
            return callback([]);
        }
        const {userId, user_id, type} = data;
        const memberId = Boolean(user_id) ? user_id : userId;

        let sql = '';
        if(type == 1) {     // 팔로잉
            sql = `SELECT U.id, U.profile, U.nickname, U.email, U.email, F.id AS follow_id
                    FROM tbl_follow AS F 
                    LEFT JOIN tbl_users AS U ON U.id=F.target_id
                    WHERE U.status="N" AND user_id="${memberId}" ORDER BY F.id DESC`;
        }
        else {
            sql = `SELECT U.id, U.profile, U.nickname, U.email, U.email, F.id AS follow_id
                    FROM tbl_follow AS F 
                    LEFT JOIN tbl_users AS U ON U.id=F.user_id
                    WHERE U.status="N" AND target_id="${memberId}" ORDER BY F.id DESC`;
        }
        
        getQuery(sql, function(rows) {
            callback(rows);
        }); 
    };
    // payment
    exports.addStripePayment = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, order_id, subscription_id, amount} = data;

        let sql = '';
        async.waterfall([
            function(callback) {    // 결제
                sql = `INSERT INTO tbl_payment( user_id, pay_type, order_id, subscription_id, amount, purchase_state) VALUES("${userId}", "S", "${Boolean(order_id) ? order_id : ''}", "${subscription_id}", "${amount}", 0)`;
                insertQuery(sql, function (insertId) {
                    callback(null);
                }); 
            },
            function(callback) {
                sql = `UPDATE tbl_users SET mem_type="2", pay_time=NOW() WHERE id="${userId}"`;
                updateQuery(sql, function(result) {
                    callback(null);
                });
            }
        ], function (err, result) {
            callback(true);
        });
    };
    exports.addInAppPayment = (data, callback) => {
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId, pay_type, order_id, receipt} = data;
        const amount = 3;

        let sql = '';
        async.waterfall([
            function(callback) {    // 결제
                sql = `INSERT INTO tbl_payment( user_id, pay_type, order_id, amount, receipt, purchase_state) VALUES("${userId}", "${pay_type}", "${order_id}", "${amount}", "${receipt}", 0)`;
                insertQuery(sql, function (insertId) {
                    callback(null);
                }); 
            },
            function(callback) {
                sql = `UPDATE tbl_users SET mem_type="2", pay_time=NOW() WHERE id="${userId}"`;
                updateQuery(sql, function(result) {
                    callback(null);
                });
            }
        ], function (err, result) {
            callback(true);
        });
    };
    exports.getPayDataBySubscriptionID = function(subscription_id, callback){
        callback = callback == null? nop:callback;
        if(!subscription_id) {
            return callback(true);
        }

        let sql = `SELECT * FROM tbl_payment WHERE subscription_id="${subscription_id}" `;
                    
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    exports.getPayData = function(data, callback){
        callback = callback == null? nop:callback;
        if(!data) {
            return callback(false);
        }
        const {userId} = data;

        let sql = `SELECT *, 
                    (SELECT mem_type FROM tbl_users AS U WHERE U.id=P.user_id) AS mem_type,
                    CONCAT(DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m'), "-", DAY(reg_time + INTERVAL 1 MONTH) ) AS next_month
                    FROM tbl_payment AS P WHERE user_id="${userId}" AND purchase_state=0 ORDER BY reg_time DESC LIMIT 1`;
                    
        getQuery(sql, function(rows) {
            callback(rows[0]);
        }); 
    };
    // rss
    exports.getMainRss = function(callback){
        callback = callback == null? nop:callback;

        let userId  = 0;
        let sort    = 'share_cnt2 DESC, like_cnt2 DESC, bookmark_cnt2 DESC, cmt_cnt2 DESC, visit_cnt2 '; 
        
        let sql = `SELECT P.*, U.profile, U.nickname, U.email,
                        ${getPostSelectSql(userId, true)}
                        FROM tbl_post AS P
                        LEFT JOIN tbl_users AS U ON U.id=P.user_id
                        WHERE P.status="N" AND P.hide=0 
                        ORDER BY ${sort} DESC LIMIT 10000`;
        
        getQuery(sql, function(rows) {
            callback(rows);
        });
    };
    // fetch tag, mention list
    exports.fetchMentionList = function(fields, callback){
        callback = callback == null? nop:callback;

        const {content, userId} = fields;

        let sql = `SELECT nickname, 
                    (SELECT F.id FROM tbl_follow AS F LEFT JOIN tbl_users AS U1 ON U1.id=F.user_id WHERE U1.status="N" AND F.user_id="${userId ? userId : ''}" AND F.target_id=U.id LIMIT 1) AS following_id
                    FROM tbl_users AS U WHERE nickname LIKE "${content}%" AND status='N' ORDER BY following_id DESC LIMIT 30`;
                    
        getQuery(sql, function(rows) {
            if(rows && rows.length == 0) {
                sql = `SELECT nickname, 
                    (SELECT F.id FROM tbl_follow AS F LEFT JOIN tbl_users AS U1 ON U1.id=F.user_id WHERE U1.status="N" AND F.user_id="${userId ? userId : ''}" AND F.target_id=U.id LIMIT 1) AS following_id
                    FROM tbl_users AS U WHERE nickname LIKE "%${content}%" AND status='N' ORDER BY following_id DESC LIMIT 30`;
                    
                getQuery(sql, function(rows2) {
                    callback([...rows, ...rows2].slice(0, 30));
                }); 
            }
            else {
                callback(rows);
            }
        }); 
    };
    exports.fetchTagList = function(keyword, callback){
        callback = callback == null? nop:callback;

        const where = `UPPER(P.tags) LIKE UPPER("%${keyword}%")`;

        let sql = `SELECT tags FROM tbl_post AS P WHERE tags<>"" AND status="N" AND hide=0 AND ${where} ORDER BY reg_time DESC LIMIT 200`;

        getQuery(sql, function(rows) {
            let result = '';
            if(rows) {
                result = rows.map(dt => dt.tags).join();
            }
            callback(result);
        });
    };
    exports.getPostInfo = function(data, callback){
        callback = callback == null? nop:callback;

        const {id} = data;
        
        let sql = `SELECT id, type, title, imgs FROM tbl_post WHERE id="${id}"`;

        getQuery(sql, function(rows) {
            callback(rows[0]);
        });
    };

/*********************************************/
exports.query = query;