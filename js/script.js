$( document ).ready( function() {
  var tbody = $( "tbody" );
  var offsetWidth = tbody.prop( "offsetWidth" );
  var scrollWidth = tbody.prop( "scrollWidth" );
  var scrollbarWidth = offsetWidth - scrollWidth;
  var thead = $( "thead" );
  thead.width( thead.width() - scrollbarWidth );
  hideshowcol();
  updateDevices();
  $("#send").attr("disabled", true);
});
$("#update").click(function(){
  $("#serialports").empty();
  $("#serialports_button").html("シリアルポートを選択して下さい...");
  selected = "";
  updateDevices();
});

var count = 0;
var selected = "";
var connectionId;
var connecting = false;
$("#connect").click(function(){
  if(connecting === false){
    chrome.serial.connect(selected, {bitrate: 115200}, function(connectionInfo){
      connectionId = connectionInfo.connectionId;
      $("#connect").removeClass("btn-primary");
      $("#connect").addClass("btn-danger");
      $("#connect").html("切断");
      $("#serialports_button").attr("disabled", true);
      $("#update").attr("disabled", true);
      connecting = true;
      $("#send").removeAttr("disabled");
    });
  }else{
    chrome.serial.disconnect(connectionId, function(){
      $("#connect").removeClass("btn-danger");
      $("#connect").addClass("btn-primary");
      $("#connect").html("接続");
      $("#serialports_button").removeAttr("disabled");
      $("#update").removeAttr("disabled");
      $("#send").attr("disabled", true);
      connecting = false;
    });
  }
});
$("#separate_data").click(function(){
  hideshowcol();
});
$("#send").click(function(){
  var ary = new Uint8Array(7);
  var dmy = 0xff;
  var stx = 0x41;
  var cmd, data1, data2, data;

  if($("#broadcast").is(":checked") === true){
    id = 0xff;
  }else{
    id = parseInt($("#id").val());
  }
  if($("#emergency").is(":checked") === true){
    cmd = 0xff;
  }else{
    cmd = parseInt($("#cmd").val());
  }
  if($("#separate_data").is(":checked") === true){
    data1 = parseInt($("#data1").val());
    data2 = parseInt($("#data2").val());
    data  = data1 + (data2 << 8);
  }else{
    data = parseInt($("#data").val());
    data1 = data & 0xff;
    data2 = data >>> 8;
  }
  var sum = (id + cmd + data1 + data2) & 0xff;
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

var queue = [];
chrome.serial.onReceive.addListener(function(info){
  var ary = new Uint8Array(info.data);
  $.each(ary, function(i, v){
    queue.push(v);
  });
  console.log(queue);
  while(6 <= queue.length){
    if(queue.shift() != 0x41){
      console.log("x_x stx");
      continue;
    }
    var rcv_id = queue.shift();
    var rcv_cmd = queue.shift();
    var rcv_data1 = queue.shift();
    var rcv_data2 = queue.shift();
    var rcv_sum = queue.shift();
    var sum = (rcv_id + rcv_cmd + rcv_data1 + rcv_data2) & 0xff;
    if(sum !== rcv_sum){
      console.log("x_x sum");
      continue;
    }
    var rcv_data = rcv_data1 + (rcv_data2<<8);
    $('#logTable tbody').prepend("<tr><td>"+ (++count) +"</td><td>"+rcv_id+"</td><td>"+rcv_cmd+"</td><td>"+rcv_data1+"</td><td>"+rcv_data2+"</td><td>"+rcv_data+"</td></tr>");
  }
});

syncCheckAndReadonly($("#broadcast"), $("#id"));
syncCheckAndReadonly($("#emergency"), $("#cmd"));
syncCheckAndReadonly($("#random1"), $("#data1"));
syncCheckAndReadonly($("#random2"), $("#data2"));
syncCheckAndReadonly($("#random"), $("#data"));

function hideshowcol(){
  var separate = $("#separate_data").is(':checked');
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

function syncCheckAndReadonly(check_obj, ro_obj){
  check_obj.click(function(){
    if(check_obj.is(":checked") === true){
      ro_obj.attr("readonly", true);
    }else{
      ro_obj.removeAttr("readonly");
    }
  });
}

function updateDevices(){
  chrome.serial.getDevices(function(devices){
    devices.forEach(function(port){
      var path = escape(port.path);
      $("#serialports").append("<li role=\"presentation\"><a role=\"menuitem\" tabindex=\"-1\" href=\"#\" id=\"" + path + "\" data-value=\"" + port.path + "\">" + port.path + "</a></li>");
      $(document).on("click", "#"+path, function(){
        $(this).parents('.dropdown').find('.dropdown-toggle').html($(this).text() + ' <span class="caret"></span>');
        selected = $(this).attr("data-value");
        $(this).parents('.dropdown').find('input[name="dropdown-value"]').val($(this).attr("data-value"));
      });
    });
  });
}

function escape(val){
    return val.replace(/[ !"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '');
}