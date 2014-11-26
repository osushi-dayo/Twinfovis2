var target = [];
$(function(){
    //var socket = io.connect('http://192.168.33.10');
    var socket = io();

    var copiedLinks = [];//どんどんターゲットとソースのデータが追加されていくlinksとは別の実体

    $("#search_submit").click(function(e){
        socket.emit('search',$('#search_user').val());
        d3.select("body")
            .append("div")
            .attr("id", "loading")
            .append("img")
            .attr("src","/images/loading.gif");
        return e.preventDefault();//ページ更新しないsubmitじゃなくてただのボタンでも良い
    });
    $("#make_list").click(function(e){
        // socket.emit('search friernds',target);
         console.log(target);
        // return e.preventDefault();

        //ここで画面下にhtml(detail)を追加したい
        prof_detail_html();
        //新しく表示したページ下まで自動スクロール
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 980 }, { duration: 2000, easing: 'swing', });
    });
    $("#scroll_top").click(function(e){
        var target_scroll = $('html, body');
        target_scroll.animate({ scrollTop: 0 }, "slow");
    });


    socket.on("Root response",function (data){
        //console.log(data);
        // console.log(data.mentionArray);
        // console.log(data.mentionArrayForCopy);
        copiedLinks = data.mentionArrayForCopy;
        socket.emit("Sub search",data.uniqueTargets);

        // renderNodes(data.mentionArray, true, function(){
        //     console.log("rendered RootNodes");
        //     socket.emit("Sub search",data.uniqueTargets);
        //     //subノードの情報取得のためにsubノードの名前を送り返す
        // });
    });

    var counter = 0;

    socket.on("Sub response",function (data){

        copiedLinks = copiedLinks.concat(data.subMentionArray);
        //console.log(copiedLinks);

        //console.log(counter);
        if(counter == data.num_of_SubNodes -1){
            renderNodes(copiedLinks, false, function(){
                    console.log("rendered SubNodes");
                });
            counter = 0;
        }
        counter++;


        // if(data.length != 0){
        //     renderNodes(copiedLinks, false, function(){
        //             console.log("rendered SubNodes");
        //         });
        // }

    });


    socket.on("Frirends response",function(data){
        console.log(data);
    });

});