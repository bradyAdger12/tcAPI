linearInterpolate = function(before, after, atPoint) {
	return Math.round(before + (after - before) * atPoint);
};

interpolateArray = function (data, fitCount) {
	var newData = new Array();
	var springFactor = new Number((data.length - 1) / (fitCount - 1));
	newData[0] = data[0]; // for new allocation
	for ( var i = 1; i < fitCount - 1; i++) {
		var tmp = i * springFactor;
		var before = new Number(Math.floor(tmp)).toFixed();
		var after = new Number(Math.ceil(tmp)).toFixed();
		var atPoint = tmp - before;
		newData[i] = this.linearInterpolate(data[before], data[after], atPoint);
		}
	newData[fitCount - 1] = data[data.length - 1]; // for new allocation
	return newData;
};

module.exports = interpolateArray