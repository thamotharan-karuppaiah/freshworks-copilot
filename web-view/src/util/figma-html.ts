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
      return convertContainerNodeToHTML(node);
    case 'RECTANGLE':
      return convertRectangleToHTML(node as Rectangle);
    case 'TEXT':
      return convertTextToHTML(node as Text);
    case 'ELLIPSE':
      return convertEllipseToHTML(node as Ellipse);
    case 'REGULAR_POLYGON':
      return convertPolygonToHTML(node as RegularPolygon);
    case 'STAR':
      return convertStarToHTML(node as Star);
    case 'LINE':
      return convertLineToHTML(node as Line);
    case 'VECTOR':
      return convertVectorToHTML(node as Vector);
    case 'SLICE':
      return convertSliceToHTML(node as Slice);
    case 'BOOLEAN_OPERATION':
      return convertBooleanOperationToHTML(node as BooleanOperation);
    default:
      return '';
  }
}


function convertContainerNodeToHTML(node: Frame | Group | Component | Instance | Canvas): string {
  let html = '';
  if (node.children) {
    for (const child of node.children.filter(child => child.visible !== false)) {
      let relativeParent = (child as any).layoutPositioning === 'ABSOLUTE' ? node : (node as any).relativeParent;
      html += convertNodeToHTML({ ...child, parent: node, rootNode: (node as any).rootNode } as any, relativeParent); //THAMO
    }
  }
  return `<div data-node-name="${node.name}" class="${node.type.toLowerCase()}" style="${convertStylesToCSS(node)}">${html}</div>`;
}

function convertRectangleToHTML(node: Rectangle): string {
  return `<div class="rectangle" style="${convertStylesToCSS(node)}"></div>`;
}

function convertTextToHTML(node: Text): string {
  const tagName = determineTextTag(node);
  return `<${tagName} class="text" style="${convertStylesToCSS(node)}">${node.characters}</${tagName}>`;
}

function convertEllipseToHTML(node: Ellipse): string {
  return `<div class="ellipse" style="${convertStylesToCSS(node)} border-radius: 50%;"></div>`;
}

function convertPolygonToHTML(node: RegularPolygon): string {
  // Placeholder: Implement polygon conversion logic here
  return `<div class="polygon" style="${convertStylesToCSS(node)}"></div>`;
}

function convertStarToHTML(node: Star): string {
  // Placeholder: Implement star conversion logic here
  return `<div class="star" style="${convertStylesToCSS(node)}"></div>`;
}

function convertLineToHTML(node: Line): string {
  // Placeholder: Implement line conversion logic here
  return `<div class="line" style="${convertStylesToCSS(node)}"></div>`;
}


function convertVectorToHTML(node: Vector): string {
  // Placeholder: Implement vector conversion logic here
  return `<div class="vector" style="${convertStylesToCSS(node)};background: #92A2B1;visibility:hidden;"></div>`;
}

function convertSliceToHTML(node: Slice): string {
  // Placeholder: Implement slice conversion logic here
  return `<div class="slice" style="${convertStylesToCSS(node)}"></div>`;
}

function convertBooleanOperationToHTML(node: BooleanOperation): string {
  // Placeholder: Implement boolean operation conversion logic here
  return `<div class="boolean-operation" style="${convertStylesToCSS(node)}"></div>`;
}

function determineTextTag(node: Text): string {
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
    styles += `width: ${node.absoluteBoundingBox.width}px; `;
    styles += `height: ${node.absoluteBoundingBox.height}px; `;
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

export function createComponent(node: Node, imageMap: any, a: any, b: any): string {
  return convertNodeToHTML({ ...node, rootNode: node } as any, imageMap);
}
