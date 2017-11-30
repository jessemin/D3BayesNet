var width = screen.width * 0.8;
var height = screen.height;
var radius = 80;
var svg = d3.select("svg")
  .attr('width', width)
  .attr('height', height)

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
d3.csv("/data/small.csv", function(error, data) {
  if (error) {
    // Handle error if there is any
    return console.warn(error);
  }

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

  tabulate(["age", "portembarked"],["fare", "sex"]);
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

  var pos1 = positions[label_2_index[columnName1]];
  var pos2 = positions[label_2_index[columnName2]];
  var line = svg.append("line")
    .attr("pie1", columnName1)
    .attr("pie2", columnName2)
    .style("stroke", "black")
    .style("stroke-width", 3)
    .attr("x1", pos1[0])
    .attr("y1", pos1[1])
    .attr("x2", pos2[0])
    .attr("y2", pos2[1]);
}

// The table generation function
function tabulate(target_vars, dep_vars) {
  d3.csv("/data/small.csv", function(error, data) {
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
    $table.append(caption_str)
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
        row += dep_key_order[m] + "=" + r_key[m];
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
    $('#info-panel-table').append($table);
    $('#info-panel-table').click(off);
  });
}

function on() {
    $('#info-panel-table').css("display", "block");
}

function off() {
    $('#info-panel-table').css("display", "None");
}
