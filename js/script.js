$(function(){
  $(".dropdown-menu li a").click(function(){
    $(this).parents('.dropdown').find('.dropdown-toggle').html($(this).text() + ' <span class="caret"></span>');
    $(this).parents('.dropdown').find('input[name="dropdown-value"]').val($(this).attr("data-value"));
  });


});

$( document ).ready( function() {
  var tbody = $( "tbody" );
  var offsetWidth = tbody.prop( "offsetWidth" );
  var scrollWidth = tbody.prop( "scrollWidth" );
  var scrollbarWidth = offsetWidth - scrollWidth;
  var thead = $( "thead" );
  thead.width( thead.width() - scrollbarWidth );
  hideshowcol();
});

$("#separate_data").click(function(){
  hideshowcol();
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