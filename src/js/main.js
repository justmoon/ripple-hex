var HexGrid = function ()
{
  this.radius = 12;
  this.offsetX = 0;
  this.offsetY = 0;
  this.circleDist = 12;
  this.circleSize = 8;
  this.connWidth = 6;

  this.points = [];
  this.pointsIndex = {};

  this.lBG = new Kinetic.Layer();
  this.lFG = new Kinetic.Layer();
  stage.add(this.lBG);
  stage.add(this.lFG);
};

HexGrid.prototype.setOffset = function (x, y)
{
  this.lBG.setPosition(x, y);
  this.lFG.setPosition(x, y);
};

HexGrid.prototype.drawBackground = function ()
{
  //this.lBG.clear();

  // From: http://stackoverflow.com/questions/2049196/
  var points = [], index = {};
  var deltas = [[1,0,-1],[0,1,-1],[-1,1,0],[-1,0,1],[0,-1,1],[1,-1,0]];
  for (var r = 0; r < this.radius; r++) {
    var x = 0,
        y = -r,
        z = r;

    this.drawBackgroundCircle(x, y, z);
    points.push([x, y, z]);
    index[x+":"+y+":"+z] = true;

    for (var j = 0; j < 6; j++) {
      var hexes = (j === 5) ? r-1 : r;

      for (var i = 0; i < hexes; i++) {
        x = x+deltas[j][0];
        y = y+deltas[j][1];
        z = z+deltas[j][2];
        this.drawBackgroundCircle(x, y, z);
        points.push([x, y, z]);
        index[x+":"+y+":"+z] = true;
      }
    }
  }
  this.points = points;
  this.pointsIndex = index;

  this.lBG.draw();
};

HexGrid.prototype.drawBackgroundCircle = function (x, y, z)
{
  var coord = this.hexToGeo(x, y, z);

  var circle = new Kinetic.Circle({
    x: coord[0],
    y: coord[1],
    radius: this.circleSize,
    fill: '#ddd'
  });

  // add the shape to the layer
  this.lBG.add(circle);

  return circle;
}

HexGrid.prototype.drawForegroundCircle = function (x, y, z, color)
{
  var coord = this.hexToGeo(x, y, z);

  var circle = new Kinetic.Circle({
    x: coord[0],
    y: coord[1],
    radius: this.circleSize,
    fill: color || "#333"
  });

  // add the shape to the layer
  this.lFG.add(circle);

  return circle;
}

HexGrid.prototype.drawConnection = function (from, to)
{
  from = this.hexToGeo.apply(this, from);
  to   = this.hexToGeo.apply(this, to);

  var line = new Kinetic.Line({
    points: from.concat(to),
    stroke: '#890000',
    strokeWidth: this.connWidth,
    lineCap: 'round',
    lineJoin: 'round'
  });

  this.lFG.add(line);

  return line;
};

HexGrid.prototype.hexToGeo = function (u, v, w)
{
  // From: http://stackoverflow.com/questions/2459402/
  var s = this.circleDist,
      y = 3/2 * s * w,
      b = 2/3 * y / s,
      x = Math.sqrt(3) * s * ( w/2 + u );

  return [x, y];
};

HexGrid.prototype.accToHex = function (account)
{
  var acc = ripple.UInt160.from_json(account);
  return acc.to_bn().mod(this.points.length).getLimb(0);
};

HexGrid.prototype.draw = function ()
{
  this.lFG.draw();
};

var TxViz = function (data) {
  this.tx = data;
  this.mmeta = new ripple.Meta(data.meta);

  this.tags = {};
}

TxViz.colors = {
  "start": "#F00",
  "dest": "#0F0",
  "hop": "#00F"
};

/**
 * Selects a point on the hex grid for each account this tx affects.
 */
TxViz.prototype.genTags = function ()
{
  if (this.tx.Paths) {
    for (var i = 0, l1 = this.tx.Paths.length; i < l1; i++) {
      var path = this.tx.Paths[i];

      for (var j = 0, l2 = path.length; j < l2; j++) {
        var hop = path[j];
        this.tagNode(hop.account, "hop");
      }
    };
  }
  this.tagNode(this.tx.Account, "start");
  this.tagNode(this.tx.Destination, "dest");
};

/**
 * Create Kinetic.js shapes for the tagged accounts.
 */
TxViz.prototype.drawTags = function ()
{
  _.each(this.tags, function (tag) {
    var point = grid.points[tag.point];
    var color = TxViz.colors[tag.tag];
    grid.drawForegroundCircle(point[0], point[1], point[2], color);
  });
};

TxViz.prototype.drawPaths = function ()
{
  if (this.tx.Paths) {
    for (var i = 0, l1 = this.tx.Paths.length; i < l1; i++) {
      var path = this.tx.Paths[i];
      var lastNode = this.tx.Account;

      for (var j = 0, l2 = path.length; j < l2; j++) {
        var hop = path[j];
        this.drawHop(lastNode, hop.account);
        lastNode = hop.account;

        if (j === (l2 - 1)) this.drawHop(hop.account, this.tx.Destination);
      }
    };
  }
};

TxViz.prototype.drawHop = function (from, to)
{
  var fromCoords = grid.points[this.tags[from].point],
      toCoords   = grid.points[this.tags[to].point];

  grid.drawConnection(fromCoords, toCoords);
};

TxViz.prototype.draw = function ()
{
  this.genTags();
  this.drawPaths();
  this.drawTags();

  grid.draw();
};

TxViz.prototype.tagNode = function (account, newTag)
{
  var tag = this.tags[account] || {};
  tag.account = account;
  tag.point = tag.point || grid.accToHex(account);
  tag.tag = newTag;
  this.tags[account] = tag;
};

var stage = new Kinetic.Stage({
  container: 'container',
  width: 578,
  height: 450
});

var grid = new HexGrid();
grid.setOffset(stage.getWidth()/2, stage.getHeight()/2);
grid.drawBackground();

var viz = new TxViz(demoTx);
viz.draw();
