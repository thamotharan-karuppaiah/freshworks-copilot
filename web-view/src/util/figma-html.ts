import { Document, Node, Frame, Rectangle, Text, Group, Vector, Component, Instance, Ellipse, RegularPolygon, Star, Line, Slice, BooleanOperation, Paint, Canvas } from 'figma-js';
import { convertStylesToCSS } from './css';

function convertNodeToHTML(node: Node, imageMap?): string {
  if (node?.visible === false) {
    return '';
  }
  switch (node.type) {
    case 'FRAME':
    case 'GROUP':
    case 'COMPONENT':
    case 'INSTANCE':
    case 'CANVAS':
      return convertContainerNodeToHTML(node, imageMap);
    case 'RECTANGLE':
      return convertRectangleToHTML(node as Rectangle, imageMap);
    case 'TEXT':
      return convertTextToHTML(node as Text, imageMap);
    case 'ELLIPSE':
      return convertEllipseToHTML(node as Ellipse, imageMap);
    case 'REGULAR_POLYGON':
      return convertPolygonToHTML(node as RegularPolygon, imageMap);
    case 'STAR':
      return convertStarToHTML(node as Star, imageMap);
    case 'LINE':
      return convertLineToHTML(node as Line, imageMap);
    case 'VECTOR':
      return convertVectorToHTML(node as Vector, imageMap);
    case 'SLICE':
      return convertSliceToHTML(node as Slice, imageMap);
    case 'BOOLEAN_OPERATION':
      return convertBooleanOperationToHTML(node as BooleanOperation, imageMap);
    default:
      return '';
  }
}


function convertContainerNodeToHTML(node: Frame | Group | Component | Instance | Canvas, imageMap?): string {
  let html = '';
  if (node.children) {
    for (const child of node.children.filter(child => child.visible !== false)) {
      html += convertNodeToHTML({ ...child, parent: node, rootNode: (node as any).rootNode } as any, imageMap); //THAMO
    }
  }
  return `<div data-node-name="${node.name}" class="${node.type.toLowerCase()}" style="${convertStylesToCSS(node, imageMap)}">${html}</div>`;
}

function convertRectangleToHTML(node: Rectangle, imageMap?): string {
  return `<div class="rectangle" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}

function convertTextToHTML(node: Text, imageMap?): string {
  const tagName = determineTextTag(node);
  return `<${tagName} class="text" style="${convertStylesToCSS(node, imageMap)}">${node.characters}</${tagName}>`;
}

function convertEllipseToHTML(node: Ellipse, imageMap?): string {
  return `<div class="ellipse" style="${convertStylesToCSS(node, imageMap)} border-radius: 50%;"></div>`;
}

function convertPolygonToHTML(node: RegularPolygon, imageMap?): string {
  // Placeholder: Implement polygon conversion logic here
  return `<div class="polygon" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}

function convertStarToHTML(node: Star, imageMap?): string {
  // Placeholder: Implement star conversion logic here
  return `<div class="star" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}

function convertLineToHTML(node: Line, imageMap?): string {
  // Placeholder: Implement line conversion logic here
  return `<div class="line" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}


function convertVectorToHTML(node: Vector, imageMap?): string {
  // Placeholder: Implement vector conversion logic here
  return `<div class="vector" style="${convertStylesToCSS(node, imageMap)};background: #92A2B1;visibility:hidden;"></div>`;
}

function convertSliceToHTML(node: Slice, imageMap?): string {
  // Placeholder: Implement slice conversion logic here
  return `<div class="slice" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}

function convertBooleanOperationToHTML(node: BooleanOperation, imageMap?): string {
  // Placeholder: Implement boolean operation conversion logic here
  return `<div class="boolean-operation" style="${convertStylesToCSS(node, imageMap)}"></div>`;
}

function determineTextTag(node: Text, imageMap?): string {
  const fontSize = node.style.fontSize;
  // if (fontSize >= 32) return 'h1';
  // if (fontSize >= 24) return 'h2';
  // if (fontSize >= 18) return 'h3';
  // if (fontSize >= 14) return 'h4';
  // if (fontSize >= 12) return 'h5';
  return 'span';
}

function convertStylesToCSS1(node: Node | any): string {
  let styles = '';

  // Positioning and size
  if (node.absoluteBoundingBox) {
    // keep only two decimal point

    styles += `width: ${node.absoluteBoundingBox.width.toFixed(2)}px; `;
    styles += `height: ${node.absoluteBoundingBox.height.toFixed(2)}px; `;
    if (node.relativeTransform) {
      styles += `transform: translate(${node.relativeTransform[0][2]}px, ${node.relativeTransform[1][2]}px); `;
    }
  }

  // Flex properties
  if ('layoutMode' in node && node.layoutMode) {
    styles += `display: flex; `;
    styles += `flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'}; `;
    if (node.primaryAxisAlignItems) {
      styles += `justify-content: ${node.primaryAxisAlignItems.toLowerCase()}; `;
    }
    if (node.counterAxisAlignItems) {
      styles += `align-items: ${node.counterAxisAlignItems.toLowerCase()}; `;
    }
  }

  // Background color for non-text elements
  if (node.type !== 'TEXT' && 'fills' in node && node.fills.length > 0) {
    styles += `background-color: ${convertPaintToCSS(node.fills[0])}; `;
  }

  // Text color for text elements
  if (node.type === 'TEXT' && 'fills' in node && node.fills.length > 0) {
    styles += `color: ${convertPaintToCSS(node.fills[0])}; `;
  }

  // Border color and width
  if ('strokes' in node && node.strokes.length > 0) {
    styles += `border: ${node.strokeWeight}px solid ${convertPaintToCSS(node.strokes[0])}; `;
  }

  // Border radius
  if ('cornerRadius' in node) {
    styles += `border-radius: ${node.cornerRadius}px; `;
  } else if ('rectangleCornerRadii' in node && node.rectangleCornerRadii) {
    styles += `border-radius: ${node.rectangleCornerRadii.map(radius => `${radius}px`).join(' ')}; `;
  }

  // Shadows
  if ('effects' in node && node.effects.length > 0) {
    node.effects.forEach(effect => {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const shadow = effect;
        styles += `${shadow.type === 'DROP_SHADOW' ? 'box-shadow' : 'box-shadow: inset'}: ${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.spread ? shadow.spread : 0}px ${convertColorToCSS(shadow.color)}; `;
      }
    });
  }

  // Opacity
  if ('opacity' in node) {
    styles += `opacity: ${node.opacity}; `;
  }

  // Typography
  if ('style' in node) {
    if (node.style.fontSize) styles += `font-size: ${node.style.fontSize}px; `;
    if (node.style.fontFamily) styles += `font-family: ${node.style.fontFamily}; `;
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

export function createComponent(node: Node, imageMap: any): string {
  return convertNodeToHTML({ ...node, rootNode: node } as any, imageMap);
}
