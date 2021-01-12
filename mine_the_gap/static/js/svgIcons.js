export const iconShapes = ["square", "triangle", "circle", "diamond", "arrowhead-up", "triangle-down", "star",
                            "arrowhead-down", "heart", "hexagon"];
export const iconColours = ["red", "blue", "green", "yellow", "black", "orange", "pink", "brown", "gray", "purple",
                            "violet", "cyan", "magenta", "lime", "darkslategray", "indigo", "teal", "pale-yellow", "pale-green", "deep-orange"];

const defaultSize = 25;
const maxPercentSize = 5.0;

export class svgIcons{


    getSVGFromName(shape, fillColour, lineColour="black", fillOpacity=1,  percentSize= 1.0){

        if(percentSize < 0 || percentSize > maxPercentSize){
            throw "percentSize must be between 0 and 2";
        }

        if(!iconShapes.includes(shape)) {
            throw "Incorrect shape: " + shape;
        }
        if(!iconColours.includes(fillColour) && fillColour !== 'transparent' && !fillColour.startsWith('rgb(')){
            throw "Incorrect fill colour: " + fillColour;
        }
        if(!iconColours.includes(lineColour) && lineColour !== 'transparent'){
            throw "Incorrect line colour: " + lineColour;
        }

        const strokeWidth = 1;

        const strWidthHeight = 'width="' + (defaultSize*percentSize).toString() + '" height="' + (defaultSize*percentSize).toString() + '" ';
        const strFillOpacity = 'fill-opacity=' + fillOpacity.toString() + ' ';
        const strFillColour = 'fill:' + fillColour + ';';
        const strStroke = 'stroke-width:' + strokeWidth.toString() + ';stroke:' + lineColour + ';';
        const strNonSupport = 'Sorry, your browser does not support inline SVG.';

        switch(shape) {
            case 'square':
                return '<svg ' + strWidthHeight + strFillOpacity + '">' +
                    '  <rect ' + strWidthHeight + ' style="' + strFillColour + strStroke + '" />' +
                    '</svg>';
                break;
            case 'triangle':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="'+ strFillColour + strStroke + '"' +
                    '" viewBox="0 0 24 24"><path ' + strWidthHeight + ' d="M24 22h-24l12-20z"/></svg>';
                break;
            case 'star':
                return '<svg ' + strWidthHeight + strFillOpacity + '>' +
                    '  <polygon ' + strWidthHeight + ' points="'
                        + (12.5*percentSize).toString() + ',' + (1.25*percentSize).toString() + ' ' + (5*percentSize).toString() + ',' + (24*percentSize).toString() +
                        ' ' + (23*percentSize).toString() + ',' + (9*percentSize).toString() + ' ' + (1.25*percentSize).toString() + ',' + (9*percentSize).toString() +
                        ' ' + (20*percentSize).toString() + ',' + (24*percentSize).toString() + '" style="'+ strFillColour + strStroke + '"/></svg>';
                break;
            case 'circle':
                return '<svg ' + strWidthHeight + strFillOpacity + '>' +
                    '  <circle cx="' + (12.5*percentSize) + '" cy="' + (12.5*percentSize) + '" r="' + (11*percentSize)
                        + '"  style="'+ strFillColour + strStroke + '" />' +
                   '</svg>';
                break;
            case 'diamond':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="'+ strFillColour + strStroke + '"' +
                    ' fill-rule="evenodd" clip-rule="evenodd">' +
                    '<path ' + strWidthHeight + ' serif:id="shape 21" ' +
                        'd="M'+ (12*percentSize).toString() + ' .001l' + (12*percentSize).toString() + ' ' + (12*percentSize).toString()
                        + '-' + (12*percentSize).toString() + ' ' + (12*percentSize).toString() +'-' + (12*percentSize).toString()
                        + '-' + (12*percentSize).toString() + ' ' + (12*percentSize).toString() + '-' + (12*percentSize).toString()
                    + 'z"/></svg>';
                break;
            case 'arrowhead-up':
                return '<svg ' + strWidthHeight + strFillOpacity +' style="' + strFillColour + strStroke +
                    '" viewBox="0 0 24 24">' +
                    '<path d="M0 16.67l2.829 2.83 9.175-9.339 9.167 9.339 2.829-2.83-11.996-12.17z"/></svg>';
                break;
            case 'arrowhead-down':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="' + strFillColour + strStroke +
                    '" viewBox="0 0 24 24">' +
                    '<path d="M0 7.33l2.829-2.83 9.175 9.339 9.167-9.339 2.829 2.83-11.996 12.17z"/></svg>';
                break;
            case 'triangle-down':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="' + strFillColour + strStroke +
                    '" viewBox="0 0 24 24"><path d="M12 21l-12-18h24z"/></svg>';
                break;
            case 'hexagon':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="' + strFillColour + strStroke +
                    '" viewbox="0 0 20.784609690826528 24" >' +
                    '<path d="M10.3923 0L20.7846 6L20.7846 18L10.3923 24L0 18L0 6Z"></path></svg>';
                break;
            case 'heart':
                return '<svg ' + strWidthHeight + strFillOpacity + ' style="' + strFillColour + strStroke +
                    '" viewBox="0 0 24 24">' +
                    '<path d="M12 4.248c-3.148-5.402-12-3.825-12 2.944 0 4.661 5.571 9.427 12 15.808 6.43-6.381 ' +
                    '12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.944z"/></svg>';
                break;
        }
    }

    getSVGFromIdx(shapeIdx, fillColourIdx, lineColourIdx, fillOpacity, percentSize=1.0){
        var shape = null;
        var fillColour = null;
        var lineColour = null;

        if(shapeIdx < 0 || shapeIdx > iconShapes.length) {
            throw "Shape index " + shapeIdx.toString() + " out of bounds";
        }
        if(fillColourIdx < 0 || fillColourIdx > iconColours.length) {
            throw "Fill colour index " + fillColourIdx.toString() + " out of bounds";
        }
        if(lineColourIdx < 0 || lineColourIdx > iconColours.length) {
            throw "Line colour index " + lineColourIdx.toString() + " out of bounds";
        }

        shape = iconShapes[shapeIdx];
        fillColour = iconColours[fillColourIdx];
        lineColour = iconColours[fillColourIdx];

        return this.getSVGFromName(shape, fillColour, lineColour, fillOpacity, percentSize);
    }

}
