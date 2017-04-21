/* eslint-env node */
'use strict';

var Plugin = require('broccoli-plugin');
var walkSync = require('walk-sync');
var fs = require('fs');
var FSTree = require('fs-tree-diff');
var Promise = require('rsvp').Promise;
var path = require('path');
var componentNames = require('./component-names.js');
var _patches = [];

module.exports = PodNames;

PodNames.prototype = Object.create(Plugin.prototype);
PodNames.prototype.constructor = PodNames;
function PodNames(inputNode, options) {
  options = options || {};
  Plugin.call(this, [inputNode], {
    annotation: options.annotation,
    persistentOutput: true
  });

  this.currentTree = new FSTree();
  this.podNameJson = {};
  this.classicStyleDir = options.classicStyleDir;
  this.terseClassNames = options.terseClassNames;
}

PodNames.prototype.build = function() {
  var srcDir = this.inputPaths[0];

  var entries = walkSync.entries(srcDir);
  var nextTree = new FSTree.fromEntries(entries, { sortAndExpand: true });
  var currentTree = this.currentTree;

  this.currentTree = nextTree;
  var patches = currentTree.calculatePatch(nextTree);
  console.log(_patches);
  _patches = _patches.concat(patches);

  return Promise.resolve().then(this.writePodStyleName.bind(this));
};

PodNames.prototype.writePodStyleName = function() {
  for (var i = 0; i < _patches.length; i++) {
    switch (_patches[i][0]) {
      case 'create':
        this.addClass(_patches[i][1]);
        break;
      case 'unlink':
        this.removeClass(_patches[i][1]);
        break;
    }
  }


  var currentPodNames = {};
  var outputFile = path.join(this.outputPath, 'pod-names.js');
  console.log(outputFile);
  console.log(this.podNameJson);
  if (fs.existsSync(outputFile)) {
    var contents = fs.readFileSync(outputFile).toString();
    currentPodNames = JSON.parse(contents.substr(contents.indexOf('{')));
  }

  var newPodNames = Object.assign(currentPodNames, this.podNameJson);
  var output = 'export default ' + JSON.stringify(newPodNames);
  return fs.writeFileSync(outputFile, output);
}

PodNames.prototype.addClass = function(stylePath) {
  var componentPath = componentNames.path(stylePath, this.classicStyleDir),
      componentClass = componentNames.class(stylePath, this.classicStyleDir, this.terseClassNames);
  this.podNameJson[componentPath] = componentClass;
}

PodNames.prototype.removeClass = function(stylePath) {
  var componentPath = componentNames.path(stylePath, this.classicStyleDir);
  delete this.podNameJson[componentPath];
}