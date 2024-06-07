import { Document, Node, Frame, Rectangle, Text, Group, Vector, Component, Instance, Ellipse, RegularPolygon, Star, Line, Slice, BooleanOperation, Paint, Canvas } from 'figma-js';

export function convertStylesToCSS(node: Node | any): string {
    let styles = '';

    styles += getPositioningAndSizeStyles(node);
    styles += getFlexProperties(node);
    styles += getPaddingStyles(node);
    styles += getBackgroundColor(node);
    styles += getBackground(node);
    styles += getTextColor(node);
    styles += getBorderStyles(node);
    styles += getBorderRadius(node);
    styles += getShadowStyles(node);
    styles += getOpacity(node);
    styles += getTypography(node);

    return styles;
}

function getBackground(node: any) {
    let styles = '';
    if (node.type !== 'TEXT' && 'background' in node && node.background.length > 0) {
        styles += `background: ${convertBackgroundToCSS(node.fills[0])}; `;
    }
    return styles;
}

function convertBackgroundToCSS(paint) {
    if (paint.type === 'SOLID') {
        const color = paint.color;
        return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${paint.opacity !== undefined ? paint.opacity : color.a})`;
    } else if (paint.type === 'GRADIENT_LINEAR') {
        const gradientStops = paint.gradientStops.map(stop => {
            const color = stop.color;
            return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a}) ${stop.position * 100}%`;
        }).join(', ');
        const angle = calculateGradientAngle(paint.gradientHandlePositions);
        return `linear-gradient(${angle}deg, ${gradientStops})`;
    } else if (paint.type === 'GRADIENT_RADIAL') {
        const gradientStops = paint.gradientStops.map(stop => {
            const color = stop.color;
            return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a}) ${stop.position * 100}%`;
        }).join(', ');
        return `radial-gradient(circle, ${gradientStops})`;
    } else if (paint.type === 'IMAGE') {
        return `url(${paint.imageUrl})`;
    } else if (paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
        // Add similar implementations for these gradients if needed
    }
    return 'transparent';
}

function calculateGradientAngle(gradientHandlePositions) {
    // Assumes gradientHandlePositions is an array of three points
    const [p1, p2] = gradientHandlePositions;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
}

function getPositioningAndSizeStyles(node: Node | any): string {
    let styles = '';
    if (node.absoluteBoundingBox) {
        if (node.layoutSizingHorizontal !== 'HUG')
            styles += `width: ${node.absoluteBoundingBox.width}px; `;
        if (node.layoutSizingVertical !== 'HUG')
            styles += `height: ${node.absoluteBoundingBox.height}px;`;
        if (node.relativeTransform) {
            styles += `transform: translate(${node.relativeTransform[0][2]}px, ${node.relativeTransform[1][2]}px); `;
        }
    }
    if (node.RELATIVE_POSTION && !node.isFixed) {
        styles += `position: relative; `;
    }
    else if (node.layoutPositioning === 'ABSOLUTE') {
        node.parent.RELATIVE_POSTION = true;
        styles += `position: absolute; `;
        if (node.absoluteBoundingBox.x - node.parent.absoluteBoundingBox.x)
            styles += `left: ${node.absoluteBoundingBox.x - node.parent.absoluteBoundingBox.x}px; `;
        if (node.absoluteBoundingBox.y - node.parent.absoluteBoundingBox.y)
            styles += `top: ${node.absoluteBoundingBox.y - node.parent.absoluteBoundingBox.y}px; `;
    }
    else if (!node?.parent?.layoutMode) {
        styles += `position: absolute; `;
        if (!node.parent ? 0 : (node.absoluteBoundingBox.x - node.parent.absoluteBoundingBox.x))
            styles += `left: ${!node.parent ? 0 : (node.absoluteBoundingBox.x - node.parent.absoluteBoundingBox.x)}px; `;
        if (!node.parent ? 0 : (node.absoluteBoundingBox.y - node.parent.absoluteBoundingBox.y))
            styles += `top: ${!node.parent ? 0 : (node.absoluteBoundingBox.y - node.parent.absoluteBoundingBox.y)}px; `;
    }
    node.CSS = styles;
    return styles;
}

function getFlexProperties(node) {
    let styles = '';

    if ('layoutMode' in node && node.layoutMode) {
        styles += `display: flex; `;
        styles += `flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'}; `;

        // Justify-content for primary axis alignment
        if (node.primaryAxisAlignItems) {
            let justifyContent;
            switch (node.primaryAxisAlignItems) {
                case 'MIN':
                    justifyContent = 'flex-start';
                    break;
                case 'CENTER':
                    justifyContent = 'center';
                    break;
                case 'MAX':
                    justifyContent = 'flex-end';
                    break;
                case 'SPACE_BETWEEN':
                    justifyContent = 'space-between';
                    break;
                default:
                    justifyContent = node.primaryAxisAlignItems.toLowerCase();
            }
            styles += `justify-content: ${justifyContent}; `;
        }

        // Align-items for counter axis alignment
        if (node.counterAxisAlignItems) {
            let alignItems;
            switch (node.counterAxisAlignItems) {
                case 'MIN':
                    alignItems = 'flex-start';
                    break;
                case 'CENTER':
                    alignItems = 'center';
                    break;
                case 'MAX':
                    alignItems = 'flex-end';
                    break;
                default:
                    alignItems = node.counterAxisAlignItems.toLowerCase();
            }
            styles += `align-items: ${alignItems}; `;
        }

        // Gap for item spacing
        if (node.itemSpacing !== undefined && node.itemSpacing < 50) {
            styles += `gap: ${node.itemSpacing}px; `;
        }
    }

    return styles;
}


function getPaddingStyles(node: Node | any): string {
    let styles = '';
    if ('paddingLeft' in node || 'paddingRight' in node || 'paddingTop' in node || 'paddingBottom' in node) {
        styles += `padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px; `;
    }
    return styles;
}

function getBackgroundColor(node: Node | any): string {
    let styles = '';
    if (node.type !== 'TEXT' && 'fills' in node && node.fills.length > 0) {
        styles += `background-color: ${convertPaintToCSS(node.fills[0])}; `;
    }
    if (node.type !== 'TEXT' && 'background' in node && node.background.length > 0) {
    }
    return styles;
}

function getTextColor(node: Node | any): string {
    let styles = '';
    if (node.type === 'TEXT' && 'fills' in node && node.fills.length > 0) {
        styles += `color: ${convertPaintToCSS(node.fills[0])}; `;
    }
    return styles;
}

function getBorderStyles(node: Node | any): string {
    let styles = '';

    if ('strokes' in node && node.strokes.length > 0) {
        const strokeColor = convertPaintToCSS(node.strokes[0]);

        if ('individualStrokeWeights' in node) {
            const { top, right, bottom, left } = node.individualStrokeWeights;
            styles += `border-top: ${top}px solid ${strokeColor}; `;
            styles += `border-right: ${right}px solid ${strokeColor}; `;
            styles += `border-bottom: ${bottom}px solid ${strokeColor}; `;
            styles += `border-left: ${left}px solid ${strokeColor}; `;
        } else {
            styles += `border: ${node.strokeWeight}px solid ${strokeColor}; `;
        }
    }

    return styles;
}

function getBorderRadius(node: Node | any): string {
    let styles = '';
    if ('cornerRadius' in node) {
        styles += `border-radius: ${node.cornerRadius}px; `;
    } else if ('rectangleCornerRadii' in node && node.rectangleCornerRadii) {
        styles += `border-radius: ${node.rectangleCornerRadii.map(radius => `${radius}px`).join(' ')}; `;
    }
    return styles;
}

function getShadowStyles(node: Node | any): string {
    let styles = '';
    if ('effects' in node && node.effects.length > 0) {
        node.effects.forEach(effect => {
            if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
                const shadow = effect;
                styles += `${shadow.type === 'DROP_SHADOW' ? 'box-shadow' : 'box-shadow: inset'}: ${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.spread ? shadow.spread : 0}px ${convertColorToCSS(shadow.color)}; `;
            }
        });
    }
    return styles;
}

function getOpacity(node: Node | any): string {
    let styles = '';
    if ('opacity' in node) {
        styles += `opacity: ${node.opacity}; `;
    }
    return styles;
}

function getTypography(node: Node | any): string {
    let styles = '';
    if ('style' in node) {
        if (node.style.fontSize) styles += `font-size: ${node.style.fontSize}px; `;
        if (node.style.fontFamily && node.style.fontFamily !== 'SF Pro Text') styles += `font-family: ${node.style.fontFamily}; `;
        if (node.style.fontWeight) styles += `font-weight: ${node.style.fontWeight}; `;
        if (node.style.lineHeightPx) styles += `line-height: ${node.style.lineHeightPx}px; `;
        if (node.style.letterSpacing) styles += `letter-spacing: ${node.style.letterSpacing}px; `;
        if (node.style.textAlignHorizontal) styles += `text-align: ${node.style.textAlignHorizontal.toLowerCase()}; `;
        if (node.style.textAlignVertical) styles += `vertical-align: ${node.style.textAlignVertical.toLowerCase()}; `;
        if (node.style.textDecoration) styles += `text-decoration: ${node.style.textDecoration}; `;
    }
    return styles;
}


function convertPaintToCSS(paint: Paint): string {
    if (paint.type === 'SOLID') {
        const color = paint.color;
        return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${paint.opacity !== undefined ? paint.opacity : color.a})`;
    }
    // Handle other paint types (GRADIENT, IMAGE, etc.) if necessary
    return 'transparent';
}


function convertColorToCSS(color: { r: number; g: number; b: number; a: number }): string {
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
}
