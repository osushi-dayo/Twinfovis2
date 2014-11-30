var target = [];
var socket = io();
var copiedLinks = [];//どんどんターゲットとソースのデータが追加されていくlinksとは別の実体
var bio_objects = {};//表示されたノードのプロフィール情報。nameやbioやlogcationがオブジェクトで格納される。
var root_name = "";
var secondNodes = [];//第２ノード(Rootの友達)の名前を格納(検索用)
var triangle = {};//Rootを含む三角形を形成する２人[{"A": "B"}, {"c": "d"}, ...]
$(function(){

    $("#search_submit").click(function(e){
        socket.emit('search',$('#search_user').val());
        root_name = $('#search_user').val();
        d3.select("body")
            .append("div")
            .attr("id", "loading")
            .append("img")
            .attr("src","/images/loading.gif");
        return e.preventDefault();//ページ更新しないsubmitじゃなくてただのボタンでも良い
    });
    $("#make_list").click(function(e){
        socket.emit('search friernds',target);
        console.log(target);

        return e.preventDefault();
    });


    $("#scroll_top").click(function(e){
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 0 }, "slow");
    });


    socket.on("Root response",function (data){

        copiedLinks = data.mentionArrayForCopy;

        renderNodes(data.mentionArray, true, function(){
            socket.emit("Sub search",data.uniqueTargets);

            secondNodes = [];
            for(var i = 0; i < data.uniqueTargets.length; i++){
                if(!bio_objects[data.uniqueTargets[i]].isProtected){
                    secondNodes.push(data.uniqueTargets[i]);
                }
            }
            console.log(secondNodes);
        });

    });

    var counter = 0;

    socket.on("Sub response",function (data){

        copiedLinks = copiedLinks.concat(data.subMentionArray);

        //鍵垢じゃない　かつ　友達がゼロじゃない　なら　三角形が無いか検索
        if(data.subMentionArray.length > 0 && !bio_objects[data.subMentionArray["0"].source].isProtected){

            for(var i = 0; i < data.subMentionArray.length; i++){
                if(secondNodes.indexOf(data.subMentionArray[i].target) !== -1){//三角形ができていれば
                    var key_triangle = data.subMentionArray[i].target;
                    var value_triangle = data.subMentionArray[i].source;
                    if(key_triangle in triangle || triangle[value_triangle] == key_triangle){//登録済みなら
                        continue;
                    }else{
                        triangle[key_triangle] = value_triangle;
                    }
                    console.log(data.subMentionArray[i].target + "と" + data.subMentionArray[i].source);
                }
            }

        }
        //console.log(copiedLinks);
        //console.log(data);
        //console.log(counter);
        if(counter == data.num_of_SubNodes -1){
            renderNodes(copiedLinks, false, function(){
                    console.log("rendered SubNodes");
                });
            counter = 0;
        }
        counter++;

    });

    //３人まで選択=>検索　とかけた時の返信。
    //dataは{name:~ ,screen_name:~ ,bio,url:~ ,location:~ }の配列
    socket.on("Frirends response",function(data){
        //console.log(data);
        //ここで画面下にhtml(detail)を追加したい
        prof_detail_html(data);
        //新しく表示したページ下まで自動スクロール
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 980 }, { duration: 2000, easing: 'swing', });
    });

    //マウスオーバーした時参照するためのオブジェクト。プロフィールが格納されている。データ構造は以下
    // {
    //     sushi_dayo:{
    //         name:~,
    //         screen_name:~,
    //         image_url:~,
    //         location:~,
    //         bio:~
    //     },

    //     sns_ha_kuso:{
    //         name:~,
    //         screen_name:~,
    //         image_url:~,
    //         location:~,
    //         bio:~
    //     },

    //     ...
    // }
    socket.on("bio response",function(bio_obj){
        $.extend(bio_objects, bio_obj);
        //console.log(bio_obj);
    });

});