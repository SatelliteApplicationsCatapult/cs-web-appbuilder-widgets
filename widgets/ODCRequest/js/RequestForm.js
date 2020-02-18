define(["dojo/_base/declare",
    "dojo/_base/array",
    "dojo/date/locale",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./RequestForm.html",
    "dijit/form/DateTextBox",
    "dijit/form/Textarea",
    "dijit/form/Select",
    "dijit/form/NumberSpinner",
    "dijit/form/Button",
    "esri/toolbars/draw",
    "esri/symbols/SimpleFillSymbol",
    "esri/graphic",
    "esri/geometry/webMercatorUtils",
    'dojo/_base/lang'
  ],
  function(declare, array, locale, domClass, _WidgetBase, _TemplatedMixin,
           _WidgetsInTemplateMixin, template, DateTextBox, Textarea, Select, NumberSpinner,
           Button, Draw, SimpleFillSymbol, Graphic, webMercatorUtils, lang) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      templateString: template,

      name: null,
      args: null,
      map: null,

      _aoiGraphic: null,
      _drawAoi: null,

      postCreate: function() {
        this.inherited(arguments);
      },

      startup: function() {
        if (this._started) {
          return;
        }
        this.inherited(arguments);
        console.log("RequestForm.startup", this);

        for (const arg of this.args){
            this.domNode.appendChild(document.createTextNode(arg.display_name));
            this.domNode.appendChild(this._createElementByType(arg));
        }
      },

      requestClicked: function() {
        console.log("RequestForm.requestClicked", this);
      },

      _createElementByType: function(arg){

        if (arg.type === "date"){
          return new DateTextBox({
            name: arg.name
          }).domNode;
        }
        else if(arg.type === "str") {
          if (arg.valid_values.length === 0){
            return new Textarea({
              name: arg.name
            }).domNode;
          }
          else{
            // if valid_values list is not empty
            // creates a dropdown list with the
            // values given in it.
            var options = [];

            for (const value of arg.valid_values){
              options.push({label: value, value: value})
            }

            return new Select({
              name: arg.name,
              options: options
            }).domNode;
          }
        }
        else if (arg.type === "int") {

          var constraints = {};
          var value = 0;

          if (arg.valid_values.length !== 0){
            constraints = {
              min:arg.valid_values[0],
              max:arg.valid_values[1],
              places:0
            };
            value = arg.valid_values[0];
          }

          return new NumberSpinner({
            name: arg.name,
            value: value,
            constraints: constraints,
            smallDelta: 1
          }).domNode;
        }
        else if (arg.type === "wkt"){
          return this._newAoiSelector(arg);
        }
      },

      _newAoiSelector: function (arg){

        var aoiDiv = document.createElement("div");

        this.wktArea = new Textarea({
          name: arg.name
        });
        aoiDiv.appendChild(this.wktArea.domNode);

        aoiDiv.appendChild(new Button({
          label: "Select AOI",
          onClick: lang.hitch(this, this.selectAoi)
        }).domNode);

        aoiDiv.appendChild(new Button({
          label: "Clear AOI",
          onClick: lang.hitch(this, this.clearAoi)
        }).domNode);

        return aoiDiv;
      },

      selectAoi: function () {
        if(!this._aoiGraphic && !this._drawAoi){
          this._drawAoi = new Draw(this.map);
          this._drawAoi.on("draw-end", lang.hitch(this, this._addToMap));
          this._drawAoi.activate(Draw.RECTANGLE);
        }
      },

      _addToMap: function (evt) {
        this._drawAoi.deactivate();
        this._aoiGraphic = new Graphic(evt.geometry, new SimpleFillSymbol());
        this.map.graphics.add(this._aoiGraphic);
        this._drawAoi.finishDrawing();
        this._drawAoi = null;
        var coord = webMercatorUtils.webMercatorToGeographic(evt.geometry);
        this.wktArea.set('value', this._esriGeometryToWkt(coord));
      },

      _esriGeometryToWkt: function (geometry){
        if(geometry.type === 'polygon'){
          var wkt = "POLYGON((";
          geometry.rings[0].forEach(function (point) {
            wkt = wkt.concat(point[0].toString(), ' ', point[1].toString(), ',');
          });
          wkt = wkt.replace(/.$/,"))");
          return wkt;
        }
      },

      clearAoi: function () {
        this.map.graphics.remove(this._aoiGraphic);
        this._aoiGraphic = null;
        this.wktArea.set('value', "");
      }

    });

  });