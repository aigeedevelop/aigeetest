
const admin = require("firebase-admin");
const async = require("async");
const serviceAccount = require("./serviceAccountKey.json");
var fcmapp = null;
const db   = require('./db');

exports.initFirebase = function()
{
    fcmapp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

let titleList = {
    'ko': ['새로운 구독자', '새로운 게시물', '내 게시물에 댓글', '내 게시물에 좋아요', '내 댓글에 답글', '공지사항', '나에게 언급', '관리자 경고 발송', '관리자에서 정지 발송'],
    'en': ['new follower', 'New post', 'Comments on my posts', 'Likes on my posts', 'Replies to my comments', 'Notice', 'Mention to me', 'Alert issued by administrator', 'The suspension has been issued by the administrator.'],
    'hi': ['नया अनुयायी', 'Nayi post', 'मेरी पोस्ट पर कमेंट्स', 'मेरे पोस्ट पर लाइक्स', 'Respostas aos meus comentários', 'सूचना (Sūcanā)', 'मुझसे कहा', 'व्यवस्थापक द्वारा चेतावनी जारी की गई है', 'एडमिनिस्ट्रेटर की ओर से निलंबन/सस्पेंशन का आदेश जारी कर दिया गया है।'],
    'pt': ['novo seguidor', 'Nova postagem', 'Comentários em meus posts', 'Curtidas nas minhas postagens', 'मेरी कमेंट्स पर जवाब', 'Aviso', 'mencionado para mim', 'Alerta emitido pelo administrador', 'A suspensão foi decretada pelo administrador.'],
    'es': ['nuevo seguidor', 'Nueva publicación', 'Comentarios a mis publicaciones', 'Me gusta a mis publicaciones', 'Respuestas a mis comentarios', 'Producto de suscripción', 'me mencionó', 'Alerta emitida por el administrador', 'La suspensión ha sido emitida por el administrador.']
};
let contentList = {
    'ko': ['불건전한 게시물 등록으로 신고되었습니다.', '불건전한 게시물 등록으로 신고되어 글, 댓글 작성이 제한됩니다.'],
    'en': ['Reported for posting inappropriate content.', 'Reported for posting inappropriate content.'],
    'hi': ['अनुचित कॉन्टेंट को पोस्ट करने के लिए रिपोर्ट किया गया है।', 'अनुचित कॉन्टेंट को पोस्ट करने के लिए रिपोर्ट किया गया है।'],
    'pt': ['Denunciado por postar conteúdo impróprio.', 'Denunciado por postar conteúdo impróprio.'],
    'es': ['Has sido denunciado por publicar contenido inapropiado.', 'Has sido denunciado por publicar contenido inapropiado.'],
}

exports.sendPushByUserId = function ( userId, type, content, target_id, callback=()=>{}, mention=0 ) {
    if(!userId) {
        callback(0); return;
    }
    db.getUserInfoById(userId, function(result) {
        // 
        try {
            if(!Boolean(result)) {
                callback(0); return;
            }
            if(!Boolean(result.alarm_flag)) {
                callback(0); return;
            }
            const {fcm_token, login_flag, alarm_cnt, status, lang} = result;
            let title = titleList[lang][type];

            let alarm_flag = result.alarm_flag.split(',');
            let flag 	   = type > 6 ? '1' : alarm_flag[parseInt(type)];

            // 
            
            if(type == 0) {   // 나를 팔로우하셨습니다
                let nickname = content.split('님')[0];
                let pushTxtList = {
                    'ko': `<b>${nickname}님</b>이 나를 팔로우하셨습니다.`,
                    'en': `<b>${nickname}</b> started following you.`,
                    'hi': `<b>${nickname}</b> ने आपका पालन करना शुरू किया।`,
                    'pt': `<b>${nickname}</b> começou a te seguir.`,
                    'es': `<b>${nickname}</b> comenzó a seguirte.`,
                }
                content = pushTxtList[lang];
            }
            else if(type == 1) {   // 새로운 게시물을 등록했습니다.
                let nickname = content.split('님')[0];
                let pushTxtList = {
                    'ko': `<b>${nickname}님</b>이 새로운 게시물을 등록했습니다.`,
                    'en': `<b>${nickname}</b> posted a new post.`,
                    'hi': `<b>${nickname}</b> ने एक नई पोस्ट की`,
                    'pt': `<b>${nickname}</b> postou uma nova postagem.`,
                    'es': `<b>${nickname}</b> publicó una nueva publicación.`,
                }
                content = pushTxtList[lang];
            }
            else if(type == 2) {   // 나의 게시물에 댓글을 달았습니다
                let nickname = content.split('님')[0];
                let cmt      = content.split('!~#@')[1];
                let pushTxtList = {
                    'ko': `<b>${nickname}님</b>이 댓글을 달았습니다. : ${cmt}`,
                    'en': `<b>${nickname}</b> commented : ${cmt}`,
                    'hi': `<b>${nickname}</b> ने टिप्पणी की : ${cmt}`,
                    'pt': `<b>${nickname}</b> comentou : ${cmt}`,
                    'es': `<b>${nickname}</b> comentó : ${cmt}`,
                }
                content = pushTxtList[lang];
            }
            else if(type == 4) {   // 나의 댓글에 대댓글을 달았습니다
                let nickname = content.split('님')[0];
                let cmt      = content.split('!~#@')[1];
                let pushTxtList = {
                    'ko': `<b>${nickname}님</b>이 나의 댓글에 대댓글을 달았습니다 : ${cmt}`,
                    'en': `<b>${nickname}</b> replied to the comment : ${cmt}`,
                    'hi': `<b>${nickname}</b> ने टिप्पणी का जवाब दिया : ${cmt}`,
                    'pt': `<b>${nickname}</b> respondeu ao comentário : ${cmt}`,
                    'es': `<b>${nickname}</b> respondió al comentario : ${cmt}`,
                }
                content = pushTxtList[lang];
            }
            else if(type == 6) {   // 회원님을 언급했습니다
                let nickname = content.split('님')[0];
                let cmt      = content.split('!~#@')[1];
                
                let pushTxtList = mention == 1  ?
                {
                    'ko': `<b>${nickname}님</b>이 게시물에서 회원님을 언급했습니다.`,
                    'en': `<b>${nickname}</b> referred to you in this post`,
                    'hi': `<b>${nickname}</b> ने इस पोस्ट में आपका उल्लेख किया।`,
                    'pt': `<b>${nickname}</b> mencionou você nesta postagem`,
                    'es': `<b>${nickname}</b> te mencionó en esta publicación`,
                } :
                {
                    'ko': `<b>${nickname}님</b>이 댓글에서 회원님을 언급했습니다. : ${cmt}`,
                    'en': `<b>${nickname}</b> mentioned you in a comment : ${cmt}`,
                    'hi': `<b>${nickname}</b> ने आपको एक टिप्पणी में उल्लिखित किया। : ${cmt}`,
                    'pt': `<b>${nickname}</b> mencionou você em um comentário : ${cmt}`,
                    'es': `<b>${nickname}</b> te mencionó en un comentario : ${cmt}`,
                }
                content = pushTxtList[lang];
            }
            else if(type == 3) {   // 나의 게시물을 좋아요 하였습니다.
                let nickname = content.split('님')[0];
                let pushTxtList = {
                    'ko': `<b>${nickname}님</b>이 나의 게시물을 좋아요 하였습니다.`,
                    'en': `<b>${nickname}</b> liked my post.`,
                    'hi': `<b>${nickname}</b> ने मेरी पोस्ट को पसंद किया।`,
                    'pt': `<b>${nickname}</b> curtiu minha postagem.`,
                    'es': `A <b>${nickname}</b> le gusta mi publicación.`,
                }
                content = pushTxtList[lang];
            }
            if(type == 7 || type == 8) {   // 7: 관리자에서 경고 발송, 8: 관리자에서 정지 발송
                content = contentList[lang][type - 7];
                flag    = 1;
            }

            if(status == 'N' && flag == '1') {
                if(Boolean(fcm_token) && fcm_token != 'null' && login_flag == 1 ) {     // 앱인 경우 푸시알림
                    let data = {target_id};
                    data.alarm_cnt = alarm_cnt + 1;     // 뒤에서 알림 내역 추가 되므로 +1
                    let content2 = content.replace('<b>', '').replace('</b>', '');
                    exports.sendMessage(fcm_token, title, content2, data, alarm_cnt);
                }
                // 사용자 alarm list
                db.addPushHistory(userId, type, title, content, target_id);
                callback(1);
            }
            else {
                callback(0);
            }

        } catch (error) {
            console.log('send push error: ', error);
            callback(0);
        }
    });
}
exports.sendPushNotice = function ( title, content, target_id, callback=()=>{} ) {
    db.getNoticePushUserList(function(result) {
        if(!result) {
            callback(0);
        }
        // 
        try {
            let tokens = result.fcm_tokens ? result.fcm_tokens.split(',') : [];
			// 
            let arrFunctions = [];
            let callbackFn = function(splited_tokens) {
                return function (cb) {
                    exports.sendmultiFCM(splited_tokens, title, content, {target_id});
                    cb(null);
                };
            }
            for (let i = 0; i < tokens.length; i += 499) {
                const splite_tokens = tokens.slice(i, i + 499);
                arrFunctions.push(callbackFn(splite_tokens));
            }
            async.parallel(
                arrFunctions,
                function(err, rst) { }
            );

            // add push histroy
            db.addNoticePushHistory(result.ids, title, content, target_id);

        } catch (error) {
            console.log('send sendPushNotice error: ', error);
            callback(0);
        }
    });
}

exports.sendMessage = function(token, title, body, msgdata, badge=0)
{
    try {
        const message = {
            token: token,
            notification: {
                title: title,
                body: body
            },
            apns: {
                payload: {
                    aps: {
                        badge,
                        sound: 'default'
                    },
                },
            },
        };
        if(msgdata != null)
        {
            Object.keys(msgdata).forEach(function(el){
                msgdata[el] = (msgdata[el])+''
            })
            message.data = msgdata;
        };
        
        fcmapp.messaging().send(message).then((response) => {
            // console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            // console.log('Error sending message:', error);
        });
        
    } catch (error) {
        console.log('fcm error:', error)
    }
}

exports.sendmultiFCM = function(tokens, title, body, msgdata)
{
    var r_tokens = tokens.filter((item) => item != null && item != "null" && item != "" );
    var message = {
        tokens: r_tokens,
        notification: {
            title: title,
            body: body,
        },
        apns: {
            payload: {
                aps: {
                    // badge: 4,
                    sound: 'default'
                },
            },
        },
    };

    if(msgdata != null)
    {
        Object.keys(msgdata).forEach(function(el){
            msgdata[el] = (msgdata[el])+''
        })
        message.data = msgdata;
    }

    fcmapp.messaging().sendMulticast(message).then((response) => {
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(r_tokens[idx]);
            }
          });
        //   console.log('List of tokens that caused failures: ' + failedTokens);
        }
    });
}
