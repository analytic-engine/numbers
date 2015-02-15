;(function($, Observable, util, undefined){
    /* Numbers and their representation */
    'use strict';

    var Model = $.Model = function(n){
        Observable.call(this);
        this.set(n);
    };
    Model.prototype = Object.create(Observable.prototype);
    Model.prototype.constructor = Model;
    Model.prototype.set = function(n){
        this.n = n;
        this.signal('n', n);
    };

    var View = $.RegularView = function(model, container){
        this.model = model;
        this.container = container;
        this.model.on('n', this.update.bind(this));
        this.update(this.model.n);
    };
    View.prototype.update = function(n){
        this.container.innerText = n;
    };

    $.multiplication = function(base, power){
        return [ Math.pow(base, power) ];
    };
    $.power = function(base, power){
        return [ base, '<sup>', power, '</sup>' ];
    };

    var extend = util.extend;

    var Representation = $.RepresentationView = function(model, container, options){
        this.options = extend(options || {}, { base: 10, representation: $.power });
        this.model = model;
        this.container = container;
        this.model.on('n', this.update.bind(this));
        this.update(this.model.n);
    };
    Representation.prototype.update = function(n){
        var digits = math.digits(n, this.options.base);
        var content = digits.map(function(digit, index){
            var power = digits.length - 1 - index;
            return [digit, power];
        }).map(function(pair){
            return [
                pair[0],
                '&times;'
            ].concat(this.options.representation(this.options.base, pair[1])).join('');
        }.bind(this)).join('+');
        this.container.innerHTML = content;
    };

    var EditableView = $.EditableView = function(model, container, options){
        Observable.call(this);
        this.options = extend(options || {}, { editing : false });
        this.model = model;
        this.container = container;
        this.editing = false;
        this.on('mode changed', this.visibility.bind(this));
        this.model.on('n', this.update.bind(this));
        this.visibility();
        this.update(this.model.n);
    };
    EditableView.prototype = Object.create(Observable.prototype);
    EditableView.prototype.constructor = EditableView;
    EditableView.prototype.toggleEditing = function(){
        this.setEditing(!this.editing);
    };
    EditableView.prototype.startEditing = function(){
        this.setEditing(true);
    };
    EditableView.prototype.stopEditing = function(){
        this.setEditing(false);
    };
    EditableView.prototype.setEditing = function(editing){
        this.editing = editing;
        this.signal('mode changed', this.editing);
    };
    EditableView.prototype.visibility = function(){
        this.view().setAttribute('style', 'display: ' + (this.editing ? 'none' : 'inline'));
        this.input().setAttribute('style', 'display: ' + (this.editing ? 'inline' : 'none'));
    };
    EditableView.prototype.update = function(n){
        this.view().innerText = n;
        this.input().value = n;
    };
    EditableView.prototype.view = function(){
        if (!this._view){
            var element = this._view = document.createElement('span');
            this.container.appendChild(element);
            element.addEventListener('click', this.startEditing.bind(this));
        }
        return this._view;
    };
    EditableView.prototype.input = function(){
        if (!this._input){
            var element = this._input = document.createElement('input');
            element.setAttribute('size', 3);
            element.setAttribute('class', 'editable number input');
            this.container.appendChild(element);
            var action = this.stopEditing.bind(this);
            ['blur', 'change'].forEach(function(event){
                element.addEventListener(event, action);
            });
            element.addEventListener('change', function(){
                var n = this.model.n;
                try {
                    this.model.set(parseInt(element.value));
                } catch (_) {
                    this.model.set(n);
                }
            }.bind(this));
        }
        return this._input;
    };

    var PunchcardView = $.PunchcardView = function(model, container, options){
        this.options = extend(options || {}, {
            base: 10,
            width: 640, height: 480, columns: 5,
            backgroundColor: 'white', gridColor: 'black', gridWidth: 2, gridHeaderWidth: 4,
            headerFont: '20px monospace', headerDrop: 0.6,
            holeColor: 'black', holeSize: 0.75
        });
        this.model = model;
        this.container = container;
        this.model.on('n', this.update.bind(this));
        this.update(this.model.n);
    };
    PunchcardView.prototype.update = function(n){
        this.blankCard(n);
    };
    PunchcardView.prototype.blankCard = function(n){
        this.background();
        this.grid();
        this.legenda();
        this.number(n);
    };
    PunchcardView.prototype.background = function(){
        var context = this.context();
        context.save();
        context.fillStyle = this.options.backgroundColor;
        context.fillRect(0, 0, this.options.width, this.options.height);
        context.restore();
    };
    PunchcardView.prototype.grid = function(){
        var context = this.context();
        context.save();
        context.lineWidth = this.options.gridWidth;
        context.strokeStyle = this.options.gridColor;
        var cellDimensions = this.cellDimensions();
        var dx = cellDimensions.dx;
        context.beginPath();
        for (var columnIndex = 1; columnIndex <= this.options.columns; columnIndex++){
            context.moveTo(columnIndex * dx, 0);
            context.lineTo(columnIndex * dx, this.options.height);
        }
        var dy = cellDimensions.dy;
        for (var rowIndex = 1; rowIndex <= this.options.base; rowIndex++){
            context.moveTo(0, rowIndex * dy);
            context.lineTo(this.options.width, rowIndex * dy);
        }
        context.stroke();
        context.lineWidth *= this.options.gridHeaderWidth;
        context.beginPath();
        context.moveTo(this.options.columns * dx, 0);
        context.lineTo(this.options.columns * dx, this.options.height);
        context.moveTo(0, dy);
        context.lineTo(this.options.width, dy);
        context.stroke();
        context.restore();
    };
    PunchcardView.prototype.cellDimensions = function(){
        return {
            'dx': this.options.width/(this.options.columns + 1),
            'dy': this.options.height/(this.options.base + 1)
        };
    };
    PunchcardView.prototype.legenda = function(){
        var context = this.context();
        context.save();
        context.font = this.options.headerFont;
        var dimension = this.cellDimensions();
        for (var headerIndex = 0; headerIndex < this.options.columns; headerIndex++) {
            var headerMetric = context.measureText(headerIndex);
            context.fillText(
                headerIndex,
                dimension.dx * (this.options.columns - 1 - headerIndex + 0.5) - headerMetric.width/2,
                dimension.dy * this.options.headerDrop
            );
        }
        for (var digitIndex = 0; digitIndex < this.options.base; digitIndex++) {
            var digitMetric = context.measureText(digitIndex);
            context.fillText(
                digitIndex,
                dimension.dx * (this.options.columns + 0.5) - digitMetric.width/2,
                dimension.dy * (digitIndex + 1 + this.options.headerDrop)
            );
        }

        context.restore();
    };
    PunchcardView.prototype.number = function(n){
        var context = this.context();
        var dimension = this.cellDimensions();
        var radius = this.options.holeSize * Math.min(dimension.dx, dimension.dy) / 2;
        context.save();
        context.fillStyle = this.options.holeColor;
        context.beginPath();
        math.digits(n, this.options.base).reverse().forEach(function(digit, index){
            var x = dimension.dx * (this.options.columns - 1 - index + 0.5);
            var y = dimension.dy * (digit + 1 + 0.5);
            context.moveTo(x, y);
            context.arc(x, y, radius, 0, 2 * Math.PI);
        }.bind(this));
        context.fill();
        context.restore();
    };
    PunchcardView.prototype.context = function(){
        if (!this._context) {
            this._context = this.canvas().getContext('2d');
        }
        return this._context;
    };
    PunchcardView.prototype.canvas = function(){
        if (!this._canvas) {
            var canvas = this._canvas = document.createElement('canvas');
            canvas.width = this.options.width;
            canvas.height = this.options.height;
            this.container.appendChild(canvas);
        }
        return this._canvas;
    };
})(window.math = window.math || {}, ns.Observable, util)
