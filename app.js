var express = require('express')
, http = require('http')
, path = require('path')
, ntwitter = require('ntwitter')
, url = require('url')
, tw = require('twit')
, io = require('socket.io')(http);

var settings = require('./settings.js');

var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('secretsession'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});


var server = http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
var io = require('socket.io').listen(server);


app.get('/', function(req, res){
  res.render('index');
});

app.get('/single', function(req, res){
    console.log("Entering Single User Example...");

    //友達の輪を可視化するやつ
    var twit = new ntwitter({
        consumer_key: settings.CONSUMER_KEY,
        consumer_secret: settings.CONSUMER_SECRET,
        access_token_key: settings.ACCESS_TOKEN_KEY,
        access_token_secret: settings.ACCESS_TOKEN_SECRET
    });


    res.render('mainpage');

});

app.get('/signin_with_twitter', function(req, res){
    console.log("Entering Sign-in With Twitter Example...");

    var twit = new ntwitter({
        consumer_key: settings.CONSUMER_KEY,
        consumer_secret: settings.CONSUMER_SECRET
    });

    var path = url.parse(req.url, true);
    twit.login(path.pathname,"/twitter_callback")(req,res);

    /**
    * Do NOT include any sort of template rendering here
    * If you do so, it will prevent the redirect to Twitter from happening
    * res.render('do_not_enable ');
    */
});

app.get('/twitter_callback', function(req, res){
    console.log("Sucessfully Authenticated with Twitter...");

    var twit = new ntwitter({
        consumer_key: settings.CONSUMER_KEY,
        consumer_secret: settings.CONSUMER_SECRET
    });

    twit.gatekeeper()(req,res,function(){
    req_cookie = twit.cookie(req);
    twit.options.access_token_key = req_cookie.access_token_key;
    twit.options.access_token_secret = req_cookie.access_token_secret;

    res.render('signin_with_twitter');

    });
 });

io.on('connection', function (socket) {

    console.log("connected");

    socket.on('search',function(data){//"search"イベントの待ち受け

        var targetArray = [];//targetの名前を格納する配列["suigin","sayuri",...]
        var mentionArray = [];//[{sourc:hoge, target:fuga},{source:a, target:b}....]

        var T = new tw({
            consumer_key: settings.CONSUMER_KEY,
            consumer_secret: settings.CONSUMER_SECRET,
            access_token: settings.ACCESS_TOKEN_KEY,
            access_token_secret: settings.ACCESS_TOKEN_SECRET
        });
        T.get('statuses/user_timeline', { screen_name:data, include_rts:false, count:120}, function(err, searchdata, response) {

            if(err){console.log(err);}
            //console.log(searchdata);

            for(var d in searchdata){
                if(searchdata[d].in_reply_to_screen_name != null){//特定の一人へのリプライなら
                    //console.log(searchdata[d + ""].text);
                    var targetName = searchdata[d].in_reply_to_screen_name;
                    targetArray.push(targetName);
                }
            }
            //重複だけ抜き出し([1,2,2,2,3,4,5,5,6,3,3]を[2,2,2,3,3,3,5,5]にする)
            var filterdArrey = targetArray.filter(function (x, i, self) {
                        return self.indexOf(x) !== self.lastIndexOf(x);
                    });

            for(i=0; i<filterdArrey.length; i++){
                if(filterdArrey[i] == data){//自分へのmentionなら
                    //要素を削除して配列のインデックスを詰める
                    filterdArrey.splice(i--, 1);
                }
            }

            //重複したものを重複なしで取り出し([2,2,2,3,3,3,5,5]を[2,3,5]に)
            var filterdArreyUnique = filterdArrey.filter(function (x, i, self) {
                                        return self.indexOf(x) === i && i !== self.lastIndexOf(x);
                                    });
            //console.log(filterdArreyUnique);

            for(var i = 0; i < filterdArrey.length; i++){
                mentionArray.push({
                    source: data,
                    target: filterdArrey[i]
                });
            }

            //[{rootInfo:hoge},{targetUnique:filterdArrayUnique},{mentionArray:mentionArray}]
            var forRoot = {};//オブジェクト
            forRoot = {
                rootInfo:{name: "sayuri", bio: "ちゅんちゅん"},
                uniqueTargets:filterdArreyUnique,
                mentionArray:mentionArray,
                mentionArrayForCopy:mentionArray
            };

            socket.emit('Root response',forRoot);

        });

    });

    socket.on("Sub search",function (data){
        var i = 0;
        //console.log(data);
        var setInt = setInterval(function(){
            if(i < data.length){
                subSearch(data[i],function(d){//Subノードのサーチ（api制限かかったらこの3行をコメントアウト）
                    socket.emit("Sub response",{
                        subMentionArray:d,
                        num_of_SubNodes:data.length
                    });
                });
                i++;
            }else{
                clearInterval(setInt);
            }
        },1000);
    });

    socket.on("search friernds",function(data){
        searchCommonFriends(data,function(d){//dはname,screen_name,bioの配列
            socket.emit("Frirends response",d);
        });
    });

});



function subSearch(subUserName, callback){//Rootユーザー以外のところをサーチ。引数はユーザー名
    var subTargetArray = [];
    var subMentionArray = [];

    var T = new tw({
        consumer_key: settings.CONSUMER_KEY,
        consumer_secret: settings.CONSUMER_SECRET,
        access_token: settings.ACCESS_TOKEN_KEY,
        access_token_secret: settings.ACCESS_TOKEN_SECRET
    });

    T.get('statuses/user_timeline', { screen_name:subUserName, include_rts:false, count:100}, function(err, searchdataSub, response) {
        if(err){}//鍵アカウントが逐一err表示されるので省きます

        for(var d in searchdataSub){
            if(searchdataSub[d].in_reply_to_screen_name != null){//特定の一人へのリプライなら
                //console.log(searchdata[d + ""].text);
                var targetName = searchdataSub[d].in_reply_to_screen_name;
                subTargetArray.push(targetName);
            }
        }

        var subFilterdArrey = subTargetArray.filter(function (x, i, self) {
                    return self.indexOf(x) !== self.lastIndexOf(x);
                });

        for(i=0; i<subFilterdArrey.length; i++){
            if(subFilterdArrey[i] == subUserName){//自分へのmentionなら
                //要素を削除して配列のインデックスを詰める
                subFilterdArrey.splice(i--, 1);
            }
        }

        for(var i = 0; i < subFilterdArrey.length; i++){
            subMentionArray.push({
                source: subUserName,
                target: subFilterdArrey[i]
            });
        }

        return callback(subMentionArray);
    });
}

//共通の友達(フォローしている人)全員のUserOblectを検索
//引数["friend1","friend2","friend3"]
function searchCommonFriends(target, callback){

    var tmpSet = false;
    var tmpArray = [];
    var commonFriendsID = [];//共通の友達のID配列
    var counter = 0;


    var T = new tw({
        consumer_key: settings.CONSUMER_KEY,
        consumer_secret: settings.CONSUMER_SECRET,
        access_token: settings.ACCESS_TOKEN_KEY,
        access_token_secret: settings.ACCESS_TOKEN_SECRET
    });

    for(var i = 0; i < target.length; i++){
        T.get('friends/ids',{screen_name: target[i]},function(err, friendsIDs, response){
            if(err){console.log(err);}

            if(!tmpSet){//初回はtmpArrayに入れる
                tmpArray = friendsIDs.ids;
                //console.log(tmpArray);
                tmpSet = true;
            }else{
                commonFriendsID = [];
                for(var j = 0; j < tmpArray.length; j++){

                    if(friendsIDs.ids.indexOf(tmpArray[j]) !== -1){//共通項があれば
                        commonFriendsID.push(tmpArray[j]);
                    }
                }
                tmpArray = commonFriendsID;

            }


            if(counter == target.length - 1){

                //重複弾く
                commonFriendsID = commonFriendsID.filter(function (x, i, self) {
                                        return self.indexOf(x) === i;
                                    });

                if(commonFriendsID.length > 99){
                    commonFriendsID = commonFriendsID.slice(-99);
                }

                var IDs_str = "";//123111,22213321,12333432といったコンマ区切りのID達(検索用)
                for(var k = 0; k < commonFriendsID.length; k++){
                    IDs_str += commonFriendsID[k];
                    IDs_str += ",";
                }

                T.get('users/lookup',{user_id: IDs_str},function(err, friendsObjects, response){
                    //console.log(friendsObjects);
                    var friendsArray = [];

                    for(var l = 0; l < friendsObjects.length; l++){
                        friendsArray.push({
                            name: friendsObjects[l].name,
                            screen_name: friendsObjects[l].screen_name,
                            bio: friendsObjects[l].description
                        });
                    }
                    callback(friendsArray);
                });
            }

            counter++;
        });
    }
}


