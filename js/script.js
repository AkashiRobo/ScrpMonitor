$( document ).ready( function() {
  hideshowcol();
  updateDevices();
  setBaud();
  $("#scroll_v").prop("checked",true);
  $("#scroll_h").prop("checked",true);
  $("#clear_send").prop("checked",true);
  $("#cr").prop("checked",true);
  $("#lf").prop("checked",true);
  $("#display_log").prop("checked", true);
  $("#timestamp").prop("checked", true);
  $("#newline").prop("checked", true);
  $("#send").attr("disabled", true);
  $("#serial_send").attr("disabled", true);
});

let count = 0;
let selected = "";//シリアルポートのa要素のidを保存
let connectionId;
let connecting = false;
let baudrate = 115200;
$("#update").click(function(){
  $("#serialports").empty();
  $("#serialports_button").html("シリアルポートを選択して下さい...  <span class=\"caret\"></span>");
  selected = "";
  updateDevices();
});
$("#connect").click(function(){
  if(selected != ""){
    if(connecting === false){
      chrome.serial.connect($("#"+selected).attr("data-value"), {bitrate: baudrate}, function(connectionInfo){
        connectionId = connectionInfo.connectionId;
        $("#connect").removeClass("btn-primary");
        $("#connect").addClass("btn-danger");
        $("#connect").html("切断");
        $("#serialports_button").attr("disabled", true);
        $("#baudrate_button").attr("disabled", true);
        $("#update").attr("disabled", true);
        $("#send").removeAttr("disabled");
        $("#serial_send").removeAttr("disabled");
        connecting = true;
      });
    }else{
      chrome.serial.disconnect(connectionId, function(){
        $("#connect").removeClass("btn-danger");
        $("#connect").addClass("btn-primary");
        $("#connect").html("接続");
        $("#serialports_button").removeAttr("disabled");
        $("#baudrate_button").removeAttr("disabled");
        $("#update").removeAttr("disabled");
        $("#send").attr("disabled", true);
        $("#serial_send").attr("disabled", true);
        connecting = false;
      });
    }
  }
});
//シリアルモニタにテキストを表示する関数。
function addtext(text){
  $("#monitor tbody").append(text);
  //自動スクロール
  const obj = document.getElementById("monitor_data");
  if($("#scroll_v").is(":checked") === true){
    obj.scrollTop = obj.scrollHeight;
  }
  if($("#scroll_h").is(":checked") === true){
    obj.scrollLeft = obj.scrollWidth;
  }
}
//シリアル送信の入力欄上でエンターキーを押すだけで、送信ボタンをクリックした扱いになる。
$("#send_data").keyup(function(event) {
    if (event.keyCode === 13 && connecting === true) {
        $("#serial_send").click();
    }
});
let value = "";
$("#serial_send").click(function(){
  const cr_lf = new Uint8Array([0x0d,0x0a,0x00])
  let start = 0,end = 0;
  value = $("#send_data").val();
  //文字列をUint8Arrayに変換
  const encoder = new TextEncoder;
  let data_char = encoder.encode(value);
  //入力フィールドをクリア
  if($("#clear_send").is(":checked") === true){
    document.getElementById("send_data").value = "";
  }
  //改行コードの挿入
  if($("#cr").is(":checked") === true && $("#lf").is(":checked") === true){
    start = 0;
    end = 2;
  }else if($("#cr").is(":checked") === true){
    start = 0;
    end = 1;
  }else if($("#lf").is(":checked") === true){
    start = 1;
    end = 2;
  }
  let buf = new Uint8Array(data_char.length + end - start);
  buf.set(data_char);
  buf.set(cr_lf.slice(start,end),data_char.length);
  if(buf.length === 0){//入力がなく、改行コードだけでも送信する。
    return;
  }
  chrome.serial.send(connectionId, buf.buffer, function(){
    //送信ログ表示
    if($("#display_log").is(":checked") === true){
      let log = "<td class=\"log\">";
      if($("#timestamp").is(":checked") === true){ 
        log += makeTimestamp();
      }
      log += (value+"</td>");
      addtext(log);
      addtext("<nobr/>");
    }
  });
});

//データ入力欄上でエンターキーを押せば、送信できる。
function click_send(event){
  if (event.keyCode === 13 && connecting === true) {
    $("#send").click();
  }
}
$("#id").keyup(click_send);
$("#cmd").keyup(click_send);
$("#data1").keyup(click_send);
$("#data2").keyup(click_send);
$("#data").keyup(click_send);

$("#send").click(function(){
  const dmy = 0xff;
  const stx = 0x41;
  let ary = new Uint8Array(7);
  let cmd, data1, data2, data;

  if($("#broadcast").is(":checked") === true){
    id = 0xff;
  }else{
    id = parseInt($("#id").val(), 19) & 0xff;
  }
  if($("#emergency").is(":checked") === true){
    cmd = 0xff;
  }else{
    cmd = parseInt($("#cmd").val(), 10) & 0xff;
  }
  if($("#separate_data").is(":checked") === true){
    if($("#random1").is(":checked") === true){
      data1 = (Math.random() * 256) & 0xff;
    }else{
      data1 = parseInt($("#data1").val(), 10) & 0xff;
    }
    if($("#random2").is(":checked") === true){
      data2 = (Math.random() * 256) & 0xff;
    }else{
      data2 = parseInt($("#data2").val(), 10) & 0xff;
    }
    data  = (data1 & 0xff) + (data2 << 8);
    if($("#sign_set").is(":checked") === false && (data2 >>> 7) === 1){//負の数表現
      data |= 0xffff0000;
    }
  }else{
    if($("#random").is(":checked") === true){
      data = (Math.random() * 65536 - 32768) & 0xffffffff;
    }else{
      data = parseInt($("#data").val(), 10);
    }
    data1 = data & 0xff;
    data2 = (data >>> 8) & 0xff;
    if($("#sign_set").is(":checked") === true){
      data &= 0xffff;//符号なし整数表示
    }
  }
  let sum = (id + cmd + data1 + data2) & 0xff;
  ary[0] = dmy;
  ary[1] = stx;
  ary[2] = id;
  ary[3] = cmd;
  ary[4] = data1;
  ary[5] = data2;
  ary[6] = sum;
  chrome.serial.send(connectionId, ary.buffer, function(){
    $('#logTable tbody').prepend("<tr class=\"info\"><td>"+ (++count) +"</td><td>"+id+"</td><td>"+cmd+"</td><td>"+data1+"</td><td>"+data2+"</td><td>"+data+"</td></tr>");
  });
});

let queue = [];
let buf = new Uint8Array(4);
let num_bytes = 1,now = 0;
let moji = "";
let new_line = true;
let prev_t = 0;
$("#clear").click(function(){
  $("#monitor tbody").empty();
  new_line = true;
});
$("#clear_text").click(function(){
  $("#logTable tbody").empty();
  count=0;
});
chrome.serial.onReceive.addListener(function(info){
  let ary = new Uint8Array(info.data);
  let error = false;
  //15ms間通信がなければ改行する。(時間はてきとう)
  if($("#newline").is(":checked") === true && (performance.now() - prev_t) > 15 && new_line === false){
    new_line = true;
    addtext("<br/>");
  }
  $.each(ary, function(i, v){
    queue.push(v);//vに受信データが入っている。
    //表示する処理
    if($("#display").val() === "text"){
      //日本語utf-8にのみ対応
      if(now === 0){//1バイト目
        buf[0] = v;
        now = 1;
        if(v >>> 5 === 0b110){//2バイト文字  
          num_bytes = 2;
        }else if(v >>> 4 === 0b1110){//3バイト文字
          num_bytes = 3;
        }else if(v >>> 3 === 0b11110){//4バイト文字
          num_bytes = 4;
        }else{//その他　ASCII
          num_bytes = 1;
        }
      }else{//2バイト目以降
        buf[now] = v;
        if(v >>> 6 === 0b10){
          now++;
        }else{//例外処理
          error = true;
        }
      }
      if(now === num_bytes || error === true){
        now = 0;
      }else{
        return;
      }
      moji = "";
      //タイムスタンプの表示
      if(new_line === true){
        new_line = false
        if($("#timestamp").is(":checked") === true){
          moji += makeTimestamp();
        }
      }
      const decoder = new TextDecoder;
      moji += decoder.decode(buf.slice(0,num_bytes));
      if(v===10){//改行　LFを受信しないと改行できない。
        moji += "<br/>";
        new_line = true;
      }else if(v===9){//タブ
        moji += "<nobr>&#009</nobr>";
      }else if(v===13){//復帰
        moji += "<nobr>&#013</nobr>";
      }
    }else{
      moji = "";
      //タイムスタンプの表示
      if(new_line === true){
        new_line = false
        if($("#timestamp").is(":checked") === true){
          moji += makeTimestamp();
        }
      }
      switch($("#display").val()){
        case "hex":
          moji += v.toString(16).toUpperCase()+" ";
          break;
        case "dec":
          moji += v.toString(10)+" ";
          break;
        case "oct":
          moji += v.toString(8)+" ";
          break;
        case "bin":
          moji += v.toString(2)+" ";
          break;
      }
    }
    addtext(moji);
  });
  while(6 <= queue.length){
    if(queue.shift() != 0x41){
      continue;
    }
    let rcv_id = queue.shift();
    let rcv_cmd = queue.shift();
    let rcv_data1 = queue.shift();
    let rcv_data2 = queue.shift();
    let rcv_sum = queue.shift();
    let sum = (rcv_id + rcv_cmd + rcv_data1 + rcv_data2) & 0xff;
    if(sum !== rcv_sum){
      continue;
    }
    let rcv_data = (rcv_data1 & 0xff) + ((rcv_data2<<8) & 0xff00);
    if($("#sign_set").is(":checked") === false && (rcv_data2 >>> 7) === 1){//負の数表現
      rcv_data |= 0xffff0000;
    }
    $('#logTable tbody').prepend("<tr><td>"+ (++count) +"</td><td>"+rcv_id+"</td><td>"+rcv_cmd+"</td><td>"+rcv_data1+"</td><td>"+rcv_data2+"</td><td>"+rcv_data+"</td></tr>");
    if($("#newline").is(":checked") === true && new_line === false){//シリアルモニタ改行
      new_line = true;
      addtext("<br/>");
    }
  }
  prev_t = performance.now();
});
function pad(num, digit){//0で埋めて桁をそろえる。
  return ( '000' + num ).slice( -digit );
}
function makeTimestamp(){
  const date = new Date;//タイムスタンプのテキストを作成。
  return pad(date.getHours(),2)+":"+pad(date.getMinutes(),2)+":"+pad(date.getSeconds(),2)+"."+pad(date.getMilliseconds(),3)+" ｰ> "; 
}

//text以外での表示の時タイムスタンプの表示にはデータごとの改行が必要。
function checkNewLine(){
  if($("#display").val() != "text" && $("#timestamp").is(":checked") === true){
    $("#newline").prop("checked",true);
  }
}
let display_element = document.getElementById("display");
display_element.onchange = checkNewLine;

$("#timestamp").click(checkNewLine);
$("#newline").click(function(){
  if($("#display").val() != "text" && $("#newline").is(":checked") === false){
    $("#timestamp").prop("checked",false);
  }
});

$("#separate_data").click(function(){
  hideshowcol();
});

function hideshowcol(){
  let separate = $("#separate_data").is(":checked");
  if(separate === true){
    $(".data1_col").show();
    $(".data2_col").show();
    $(".data_col").hide();
  }else{
    $(".data1_col").hide();
    $(".data2_col").hide();
    $(".data_col").show();
  }
}

syncCheckAndReadonly($("#broadcast"), $("#id"));
syncCheckAndReadonly($("#emergency"), $("#cmd"));
syncCheckAndReadonly($("#random1"), $("#data1"));
syncCheckAndReadonly($("#random2"), $("#data2"));
syncCheckAndReadonly($("#random"), $("#data"));

function syncCheckAndReadonly(check_obj, ro_obj){
  check_obj.click(function(){
    if(check_obj.is(":checked") === true){
      ro_obj.attr("readonly", true);
    }else{
      ro_obj.removeAttr("readonly");
    }
  });
}
let find_port = "";
function updateDevices(){
  chrome.serial.getDevices(function(devices){
    find_port = "";
    devices.forEach(function(port){
      let path = escape(port.path);
      //ubuntuで大量にポートが表示されるときに使える奴を見つけ出す。
      if(find_port == "" && (path.indexOf("ACM") > 0 || path.indexOf("USB") > 0 || path.indexOf("AMA") > 0)){
        find_port = path;//はじめに見つけたidを保存
      }
      $("#serialports").append("<li role=\"presentation\"><a class=\"others\" role=\"menuitem\" tabindex=\"-1\" href=\"#\" id=\"" + path + "\" data-value=\"" + port.path + "\">" + port.path + "</a></li>");
      $(document).on("click", "#"+path, function(){
        $(this).parents('.dropdown').find('.dropdown-toggle').html($(this).text() + ' <span class="caret"></span>');
        //選択した要素をハイライト
        $("#"+selected).removeClass("highlight").addClass("others");
        selected = path;//$(this).attr("data-value");
        $("#"+selected).removeClass("others").addClass("highlight");
        //選択した要素へスクロール
        let obj = document.getElementById("serialports");
        let element = $("#"+selected).offset();
        let list = $("#serialports").offset();
        obj.scrollBy(0,element.top - list.top - 30);
        $(this).parents('.dropdown').find('input[name="dropdown-value"]').val($(this).attr("data-value"));
      });
    });
  });
}
$("#serialports_button").click(function(){
  setTimeout(function(){
    //選択した要素へスクロール
    let obj = document.getElementById("serialports");
    let list = $("#serialports").offset();
    let element = null;
    if(selected === "" && find_port != ""){
      //使えそうなやつへスクロールする便利機能。
      element = $("#"+find_port).offset();
    }else{
      element = $("#"+selected).offset();
    }
    if(element != null && list != null){
      obj.scrollBy(0,element.top - list.top - 30);
    }
  },10);
});
//ボーレートの配列　1200以下は動かないので消去
let baud_array = [921600, 460800, 230400, 115200, 57600, 38400, 19200, 14400, 9600, 4800, 2400];
function setBaud(){
  $("#baudrate").empty();
  baud_array.forEach(function(item){
    $("#baudrate").append("<li role=\"presentation\"><a class=\"others\" role=\"menuitem\" tabindex=\"-1\" href=\"#\" id=\"" + item + "\" data-value=\"" + item + "\">" + item + "</a></li>");
    $(document).on("click", "#"+item, function(){
      $(this).parents('.dropdown').find('.dropdown-toggle').html($(this).text() + ' <span class="caret"></span>');
      //選択を解除した要素のハイライトを削除する。
      $("#"+baudrate).removeClass("highlight").addClass("others");
      baudrate = item;
      //選択されている要素をハイライトする。
      $("#"+baudrate).removeClass("others").addClass("highlight");
      //選択した要素へスクロール
      const obj = document.getElementById("baudrate");
      let element = $("#"+baudrate).offset();
      let list = $("#baudrate").offset();
      obj.scrollBy(0,element.top - list.top - 30);
      $(this).parents('.dropdown').find('input[name="dropdown-value"]').val($(this).attr("data-value"));
    });
  });
  //選択されている要素をハイライトする。
  $("#"+baudrate).removeClass("others").addClass("highlight");
}
$("#baudrate_button").click(function(){
  if($("#send_data").val() != ""){//ボーレート選択肢の追加 シリアル送信の入力欄に baudrate:1200 のように書いて追加したいボーレートを指定した状態で、ボーレートの選択ボタンをクリックする
    let value = $("#send_data").val();
    if(value.indexOf("baudrate:") === 0){
      let newrate = value.slice(9,value.length);
      let addrate = parseInt(newrate, 10);
      if(isNaN(addrate) === false){
        let text = "<td class=\"attention\">" + "新しいボーレート ( " + newrate + " bps ) が追加されました。" +"</td>";
        addtext(text);
        addtext("<nobr/>");
        document.getElementById("send_data").value = "";
        for(let i = 0;i <= baud_array.length;i++){
          if(i === baud_array.length || baud_array[i] < addrate){
            baud_array.splice(i, 0, addrate);
            break;
          }else if(baud_array[i] === addrate){
            break;
          }
        }
        setBaud();
      }
    }
  }
  setTimeout(function(){
    //選択した要素へスクロール
    let obj = document.getElementById("baudrate");
    $("#"+baudrate).selected = true;
    let list = $("#baudrate").offset();
    let element = $("#"+baudrate).offset();
    if(element != null && list != null){
      obj.scrollBy(0,element.top - list.top - 30);
    }
  },10);
});
function escape(val){
    return val.replace(/[ !"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '');
}