var width = screen.width * 0.65;
var height = screen.height;
var radius = 80;
var svg = d3.select("svg")
  .attr('width', width)
  .attr('height', height);

var color = d3.scaleOrdinal(d3.schemeCategory20c);

var arc = d3.arc()
  .innerRadius(0)
  .outerRadius(radius);

var pie = d3.pie()
  .sort(null)
  .value(function(d) {
    return d.value;
  });

var path = d3.arc()
  .outerRadius(radius - 10)
  .innerRadius(0);

var label = d3.arc()
  .outerRadius(radius - 40)
  .innerRadius(radius - 40);

var global_statistics = {};
var label_statistics = {};
var positions = [];
var label_2_index = {};

var selected_edge_1 = [];
var selected_edge_2 = [];

d3.csv("static/data/small.csv", function(error, data) {
  if (error) {
    // Handle error if there is any
    return console.warn(error);
  }

  var $div = $('<div />').appendTo('body');

  // If there is no error
  var columns = data['columns'];
  columns.forEach(function(column, index){
    global_statistics[column] = {};
    label_statistics[column] = [];
    svg.append('g').attr('class', column);
    var colIndex = index % 4;
    var rowIndex = (index - colIndex) / 4;
    positions.push([colIndex * (width-300.0) / 3.0 + 150.0, rowIndex * 200.0 + 150.0])
    label_2_index[column] = index;
  });
  data.forEach(function(d){
    for (var key in d) {
      var value = d[key];
      if (value in global_statistics[key]) {
        global_statistics[key][value] += 1;
      } else {
        global_statistics[key][value] = 0;
      }
    }
  });

  for (var key in global_statistics) {
    var cur_column = global_statistics[key];
    for (var cur_key in cur_column) {
      label_statistics[key].push({"label": cur_key, "value": cur_column[cur_key]});
    }
  }

  Object.keys(label_statistics).forEach(function(key, index){
    drawPieNode(key, index);
  });

});

// drag functionalities
var drag = d3.drag()
  .on("start", dragstarted)
  .on("drag", dragged)
  .on("end", dragended);

function dragstarted(d) {
  d3.select(this).raise();
  d3.event.sourceEvent.stopPropagation();
  d3.event.sourceEvent.preventDefault;
}

function dragged(d) {
  var index = d3.select(this).select("g").attr("id");
  var dx = d3.event.x,
      dy = d3.event.y;
  var new_dx = Math.max(radius, Math.min(dx, width-radius));
  var new_dy = Math.max(radius*1.5, Math.min(dy, height-radius));
  var new_x = new_dx-positions[index][0];
  var new_y = new_dy-positions[index][1];
  d3.select(this).attr('center_x', new_dx);
  d3.select(this).attr('center_y', new_dy);
  d3.select(this).select("g")
    .attr("transform", shape => "translate(" + new_x + "," + new_y + ")");
  var column = d3.select(this).attr("id").substring(4);
  d3.selectAll("line").filter(function(d){
    return d3.select(this).attr('pie1') == column }
  ).attr('x1', new_dx).attr('y1', new_dy);
  d3.selectAll("line").filter(function(d){
    return d3.select(this).attr('pie2') == column }
  ).attr('x2', new_dx).attr('y2', new_dy);
}

function dragended(d) {
}

function drawPieNode(columnName, index) {
  var pie_svg = svg.append("svg:svg")
    .attr("id", "pie_"+columnName)
    .attr("class", "pie")
    .attr("center_x", positions[index][0])
    .attr("center_y", positions[index][1])
    .style('opacity',0.8)
    .on('click', function(){
      if (selected_edge_1.length == 0) {
        tabulateSingle(columnName);
        selected_edge_1.push('.arc_'+columnName);
        d3.selectAll('.arc_'+columnName).style('stroke', 'red')
        .style('stroke-width', 3.3);
      } else {
        if (selected_edge_2.length == 0) {
          if (selected_edge_1[0] == '.arc_'+columnName) {
            return;
          }
          selected_edge_2.push('.arc_'+columnName);
          tabulate([selected_edge_1[0].substring(5)], [selected_edge_2[0].substring(5)], false);
          d3.selectAll('.arc_'+columnName).style('stroke', 'blue')
          .style('stroke-width', 3.3);
        } else {
          if (selected_edge_1[0] == '.arc_'+columnName) {
            return;
          }
          if (selected_edge_2[0] == '.arc_'+columnName) {
            return;
          }
          var destroke_name = selected_edge_1[0];
          d3.selectAll(destroke_name).style('stroke', 'none')
          .style('stroke-width', 0);
          selected_edge_1[0] = selected_edge_2[0];
          d3.selectAll(selected_edge_1[0]).style('stroke', 'red')
          .style('stroke-width', 3.3);
          selected_edge_2[0] = ('.arc_'+columnName);
          d3.selectAll('.arc_'+columnName).style('stroke', 'blue')
          .style('stroke-width', 3.3);
          tabulate([selected_edge_1[0].substring(5)], [selected_edge_2[0].substring(5)], false);
        }
      }
    })
    .call(drag)
    .append("g")
    .attr("id", index);

  var title = pie_svg.append("text")
    .text(columnName)
    .attr("transform", "translate(" + positions[index][0] + "," + (positions[index][1]-80) + ")");

  var arc = pie_svg.selectAll(".arc_"+columnName)
    .data(pie(label_statistics[columnName]))
    .enter()
    .append("g")
    .attr("class", "arc_"+columnName)
    .attr("transform", "translate(" + positions[index][0] + "," + positions[index][1] + ")");

  arc.append("path")
    .attr("d", path)
    .attr("fill", function(d) {
      return color(d.data.value);
    });

  arc.append("text")
    .attr("transform", function(d) {
      return "translate(" + label.centroid(d) + ")";
    })
    .style("font-size", "1em")
    .text(function(d) {
      return d.data.label;
    });
}

function addLine(columnName1, columnName2) {
  var pie1 = d3.select("#pie_"+columnName1);
  var pie2 = d3.select("#pie_"+columnName2);

  // var pos1 = positions[label_2_index[columnName1]];
  // var pos2 = positions[label_2_index[columnName2]];
  var pos1 = [pie1.attr('center_x'), pie1.attr('center_y')];
  var pos2 = [pie2.attr('center_x'), pie2.attr('center_y')];
  var line = svg.append("line")
    .attr("pie1", columnName1)
    .attr("pie2", columnName2)
    .attr("class", columnName1+"_"+columnName2)
    .style("stroke", "black")
    .style("stroke-width", 3)
    .attr("x1", pos1[0])
    .attr("y1", pos1[1])
    .attr("x2", pos2[0])
    .attr("y2", pos2[1])
    .attr("marker-end", "url(#arrow)");
}

function tabulateSingle(columnName) {
  if ($('#info-panel-table > table').length) {
    $('#info-panel-table > table').remove();
  }
  d3.csv("static/data/small.csv", function(error, data) {
    if (error) {
      // Handle error if there is any
      return console.warn(error);
    }

    var stats = global_statistics[columnName];
    var keys = Object.keys(stats);
    var total_sum = 0;
    keys.forEach(function(key){
      total_sum += stats[key];
    });
    var $table = $('<table/>');
    var caption_str = "<caption align='top'>";
    caption_str += "Probability Distribution of " + columnName;
    caption_str += "</caption>";
    var first_row = "<tr><th></th>";
    keys.forEach(function(column){
      first_row += "<th>";
      first_row += columnName.substring(0, 5) + "=" + column;
      first_row += "</th>";
    });
    first_row += "</tr>"
    $table.append(first_row);
    var row = "<tr><td></td>";
    keys.forEach(function(column){
      row+="<td>"+Number(Math.round(stats[column] * 1.0 / total_sum+'e2')+'e-2')+"</td>";
    });
    row+="</tr>";
    $table.append(row);
    $('#prob_title').text(caption_str.substring("<caption align='top'>".length, caption_str.length-'</caption>'.length)).css('display', 'block');
    $('#two_info_panel_table').append($table);
  });
  return;
}

// The table generation function
function tabulate(target_vars, dep_vars, specific) {
  if ($('#info-panel-table > table').length) {
    $('#info-panel-table > table').remove();
  }
  if ($('#two_info_panel_table > table').length) {
    $('#two_info_panel_table > table').remove();
  }
  d3.csv("static/data/small.csv", function(error, data) {
    if (error) {
      // Handle error if there is any
      return console.warn(error);
    }

    // If there is no error
    var dep_col_to_val = {}
    dep_vars.forEach(function(elem){
      dep_col_to_val[elem] = [];
      var keys = Object.keys(global_statistics[elem]);
      keys.forEach(function(key){
        dep_col_to_val[elem].push(key);
      });
    });
    var target_col_to_val = {}
    target_vars.forEach(function(elem){
      target_col_to_val[elem] = [];
      var keys = Object.keys(global_statistics[elem]);
      keys.forEach(function(key){
        target_col_to_val[elem].push(key);
      });
    });

    // function for generating permutation
    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    function cartesianProduct(a) { // a = array of array
        var i, j, l, m, a1, o = [];
        if (!a || a.length == 0) return a;

        a1 = a.splice(0, 1)[0]; // the first array of a
        a = cartesianProduct(a);
        for (i = 0, l = a1.length; i < l; i++) {
            if (a && a.length) for (j = 0, m = a.length; j < m; j++)
                o.push([a1[i]].concat(a[j]));
            else
                o.push([a1[i]]);
        }
        return o;
    }

    var dep_permute_list = [];
    var dep_key_order = [];
    Object.keys(dep_col_to_val).forEach(function(key){
      dep_key_order.push(key);
      dep_permute_list.push(dep_col_to_val[key]);
    });
    var dep_permutation = cartesianProduct(dep_permute_list);

    var target_permute_list = [];
    var target_key_order = [];
    Object.keys(target_col_to_val).forEach(function(key){
      target_key_order.push(key);
      target_permute_list.push(target_col_to_val[key]);
    });
    var target_permutation = cartesianProduct(target_permute_list);

    // in a form of target[dep][target]
    var result = {};

    dep_permutation.forEach(function(permutation){
      var filtered = data.filter(function(d){
        var allTrue = true;
        for(var i = 0; i < dep_key_order.length; i++) {
          if (d[dep_key_order[i]] != permutation[i]) {
            allTrue = false;
            break;
          }
        }
        if(allTrue) {
          return d;
        }
        result[permutation] = {};
      });
      target_permutation.forEach(function(target){
        var final_filtered = filtered.filter(function(d){
          var allTrue = true;
          for(var i = 0; i < target_key_order.length; i++) {
            if (d[target_key_order[i]] != target[i]) {
              allTrue = false;
              break;
            }
          }
          if(allTrue) {
            return d;
          }
        });
        result[permutation][target] = final_filtered.length*1.0/filtered.length;
      });
    });

    var $table = $('<table/>');
    var caption_str = "<caption align='top'>";
    caption_str += "Probability of ";
    for (var l = 0; l < target_key_order.length; l++) {
      var tk = target_key_order[l];
      caption_str += tk;
      if (l != target_key_order.length - 1) {
        if (l == target_key_order.length - 2) {
          caption_str += " and "
        } else {
          caption_str += ", ";
        }
      }
    }
    caption_str += " given ";
    for (var l = 0; l < dep_key_order.length; l++) {
      var dk = dep_key_order[l];
      caption_str += dk;
      if (l != dep_key_order.length - 1) {
        if (l == dep_key_order.length - 2) {
          caption_str += " and "
        } else {
          caption_str += ", ";
        }
      }
    }
    caption_str += "</caption>";
    if(specific) {
      $table.append(caption_str);
    }
    var first_row = "<tr><th></th>";
    target_permutation.forEach(function(column){
      first_row += "<th>";
      for (var j = 0; j < column.length; j++) {
        first_row += target_key_order[j].substring(0,5) + "=" + column[j];
        if (j != column.length - 1) {
          first_row+=", ";
        }
      }
      first_row += "</th>";
    });
    first_row += "</tr>"
    $table.append(first_row);
    Object.keys(result).forEach(function(r_y){
      var r_key = r_y.split(',');
      var r = result[r_key];
      var row = "<tr>";
      row += "<td>";

      for (var m = 0; m < r_key.length; m++) {
        row += dep_key_order[m].substring(0,5) + "=" + r_key[m];
        if (m != r_key.length - 1) {
          row+=", ";
        }
      }
      row += "</td>";
      target_permutation.forEach(function(target_key){
        row += "<td>"+Number(Math.round(r[target_key]+'e2')+'e-2')+"</td>";
      });
      row += "</tr>";
      $table.append(row);
    });
    if(specific) {
      $('#info-panel-table').append($table);
      $('#info-panel-table').click(off);
      return;
    }
    $('#prob_title').text(caption_str.substring("<caption align='top'>".length, caption_str.length-'</caption>'.length)).css('display', 'block');
    $('#two_info_panel_table').append($table);
    return;
  });
}

function add_edge() {
  if (selected_edge_1.length > 0 && selected_edge_2.length > 0){
    addLine(selected_edge_1[0].substring(5), selected_edge_2[0].substring(5));
    d3.selectAll(selected_edge_1[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    d3.selectAll(selected_edge_2[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    selected_edge_1 = [];
    selected_edge_2 = [];
    deselect_all();
    return;
  }
  if (selected_edge_1.length == 0) {
  deselect_all();
    alert("Please click the node where edge starts.");
    return;
  }
  if (selected_edge_2.length == 0) {
  deselect_all();
    alert("Please click the node where edge ends.");
    return;
  }
}

function remove_edge() {
  if (selected_edge_1.length > 0 && selected_edge_2.length > 0){
    $( "."+selected_edge_1[0].substring(5)+"_"+selected_edge_2[0].substring(5)).remove();
    d3.selectAll(selected_edge_1[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    d3.selectAll(selected_edge_2[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    selected_edge_1 = [];
    selected_edge_2 = [];
    deselect_all();
    return;
  }
  if (selected_edge_1.length == 0) {
    deselect_all();
    alert("Please click the node where edge you want to remove starts.");
    return;
  }
  if (selected_edge_2.length == 0) {
    deselect_all();
    alert("Please click the node where edge you want to remove ends.");
    return;
  }
}

function deselect_all() {
    if ($('#two_info_panel_table > table').length) {
      $('#two_info_panel_table > h5').css('display', 'none');
      $('#two_info_panel_table > table').remove();
    }
  if (selected_edge_1.length > 0) {
    d3.selectAll(selected_edge_1[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    selected_edge_1 = [];
  }
  if (selected_edge_2.length > 0) {
    d3.selectAll(selected_edge_2[0]).style('stroke', 'none')
    .style('stroke-width', 0);
    selected_edge_2 = [];
  }
}

function on() {
  var target_variables = $('#target_variables').val();
  $('#target_variables').val('');
  var dependent_variables = $('#dependent_variables').val();
  $('#dependent_variables').val('');
  if (target_variables.length == 0 || dependent_variables.length == 0) {
    alert("Invalid input values. Please read help if you are confused.");
    return;
  }
  var tv = [];
  var dv = [];
  target_variables.split(",").forEach(function(t){
    tv.push(t.trim());
  });
  dependent_variables.split(",").forEach(function(d){
    dv.push(d.trim());
  });
  tabulate(tv, dv, true);
  $('#info-panel-table').css("display", "block");
}

function off() {
  if ($('#info-panel-table > table').length) {
    $('#info-panel-table > table').remove();
  }
  $('#info-panel-table').css("display", "None");
}
