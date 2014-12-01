var target = [];
var socket = io();
var copiedLinks = [];//どんどんターゲットとソースのデータが追加されていくlinksとは別の実体
var bio_objects = {};//表示されたノードのプロフィール情報。nameやbioやlogcationがオブジェクトで格納される。
var root_name = "";
var secondNodes = [];//第２ノード(Rootの友達)の名前を格納(検索用)
var triangle = {};//Rootを含む三角形を形成する２人[{"A": "B"}, {"c": "d"}, ...]
$(function(){

    $("#search_submit").click(function(e){
        var search_str = $('#search_user').val();
        search_str = search_str.replace(/\s+/g, "");//正規表現で空文字全削除
        //console.log(search_str);
        if(search_str == ""){
            rootSeachAlert("Cannot Search! Please set a user ID");
        }else{
            socket.emit('search',search_str);
            root_name = search_str;
            d3.select("body")
                .append("div")
                .attr("id", "loading")
                .append("img")
                .attr("src","/images/loading.gif");
        }

        return e.preventDefault();//ページ更新しないsubmitじゃなくてただのボタンでも良い
    });
    $("#make_list").click(function(e){

        if(target.length < 2){
            alert("共通の友達を探すので、二人以上選択して下さい。")
        }else{
            d3.select("body")
                .append("div")
                .attr("id", "loading")
                .append("img")
                .attr("src","/images/loading.gif");
            socket.emit('search friernds',target);
        }
        return e.preventDefault();
    });


    $("#scroll_top").click(function(e){
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 0 }, "slow");
    });


    socket.on("Root response",function (data){

        copiedLinks = data.mentionArrayForCopy;
        triangle = {};//三角形情報を初期化
        //console.dir(data.mentionArray);

        if(data.mentionArray && data.mentionArray.length > 1){
            renderNodes(data.mentionArray, true, function(){
                secondNodes = [];
                for(var i = 0; i < data.uniqueTargets.length; i++){
                    if(!bio_objects[data.uniqueTargets[i]].isProtected){
                        secondNodes.push(data.uniqueTargets[i]);
                    }
                }
                //console.log(secondNodes);
                if(secondNodes){
                    socket.emit("Sub search",data.uniqueTargets);
                }

            });
        }else{
            rootSeachAlert("Sorry! Cannot find connections. Please try with another userID.");
        }



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
                    //console.log(data.subMentionArray[i].target + "と" + data.subMentionArray[i].source);
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
        d3.select("#loading").remove();
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 830 }, { duration: 2000, easing: 'swing', });
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

    //Rootユーザー検索に対し、不正な操作or検索エラーが出た時の警告メッセージ表示＆ノード初期化
    function rootSeachAlert(alartMseeage){
        d3.select("#loading").remove();
        svg.selectAll("*").remove();
        //Usage1
        c1 = [50, 45];
        c2 = [30, 30];
        carray = [c1, c2];
        svg.append("text").attr("x",55).attr("y",50).attr("font-size", "20px").attr("font-weight", "bold").text("1. Input a screen-name.");
        marker = svg.append("defs").append("marker")
          .attr({
            'id': "arrowhead",
            'refX': 0,
            'refY': 2,
            'markerWidth': 4,
            'markerHeight': 4,
            'orient': "auto"
          });
        marker.append("path")
            .attr({
                d: "M 0,0 V 4 L4,2 Z",
                fill: "black"
            });
        svg.append("text").attr("x",65).attr("y",75).attr("font-size", "20px").text("(@hoge => hoge)");
        path = svg.append('path')
            .attr({
                'd': line(carray),
                'stroke': 'black',
                'stroke-width': 5,
                'fill': 'none',
                'marker-end':"url(#arrowhead)",
        });
        svg.append("text").attr("x",55).attr("y",100).attr("font-size", "20px").attr("font-weight", "bold").text("2. Click \"Search\".");
        svg.append("def").append("filter").attr("id","selectionGlove");

        alert(alartMseeage);
    }

});