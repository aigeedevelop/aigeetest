'use strict'
var db = require('../utils/db');
var http = require('../utils/http');

const authMiddleware = (req, res, next) => {
    // read the token from header or url 
    var token = req.headers['x-access-token'];
    var userId = req.headers['x-access-id'];
    // console.log('req.headers', req.headers)
    // token does not exist
    if(!token || !userId) {
        // console.log(" authMiddleware No Auth ");
        http.send(res, null);
        return ;
    }

    // console.log(" authMiddleware Call Check ");
    db.checkToken(userId, token, function(retval) {
        if(retval === null || (retval && retval.cnt == 0))
        {
            http.send(res, -101); // 로그인 할것
        }
        else{
            // req.usr_id = userId;
            // req.usr_memtype = retval.usr_memtype;

            next();
        }
    });
}

module.exports = authMiddleware