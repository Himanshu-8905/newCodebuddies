
import React, { useEffect, useState } from "react";

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 800;

const Board = ({
  canvasRef,
  ctx,
  color,
  tool,
  elements,
  setElements,
  history,
  setHistory,
  canvasColor,
  strokeWidth,
  updateCanvas,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");
    ctx.current = context;
    drawElements();
  }, [elements, canvasColor, currentElement]);

  const drawElements = () => {
    const context = ctx.current;
    if (!context) return;

    context.fillStyle = canvasColor;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const el of elements) {
      drawElement(context, el);
    }

    // Draw current in-progress element
    if (currentElement) {
      drawElement(context, currentElement);
    }
  };

  const drawElement = (context, el) => {
    const { tool, color, strokeWidth, points } = el;
    context.strokeStyle = color;
    context.lineWidth = strokeWidth;
    context.beginPath();

    if (tool === "pencil" || tool === "eraser") {
      context.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
      }
      context.stroke();
    } else if (tool === "line") {
      context.moveTo(points[0].x, points[0].y);
      context.lineTo(points[1].x, points[1].y);
      context.stroke();
    } else if (tool === "rectangle") {
      const x = Math.min(points[0].x, points[1].x);
      const y = Math.min(points[0].y, points[1].y);
      const width = Math.abs(points[1].x - points[0].x);
      const height = Math.abs(points[1].y - points[0].y);
      context.strokeRect(x, y, width, height);
    } else if (tool === "circle") {
      const centerX = (points[0].x + points[1].x) / 2;
      const centerY = (points[0].y + points[1].y) / 2;
      const radiusX = Math.abs(points[1].x - points[0].x) / 2;
      const radiusY = Math.abs(points[1].y - points[0].y) / 2;
      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.stroke();
    }
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    let newElement = null;

    if (tool === "pencil" || tool === "eraser") {
      newElement = {
        tool,
        color: tool === "eraser" ? canvasColor : color,
        strokeWidth,
        points: [{ x, y }],
      };
    } else if (["line", "rectangle", "circle"].includes(tool)) {
      newElement = {
        tool,
        color,
        strokeWidth,
        points: [{ x, y }, { x, y }],
      };
    }

    if (newElement) {
      setCurrentElement(newElement);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentElement) return;
    const { x, y } = getCanvasCoordinates(e);
    let updatedElement = { ...currentElement };

    if (tool === "pencil" || tool === "eraser") {
      updatedElement.points = [...currentElement.points, { x, y }];
    } else if (["line", "rectangle", "circle"].includes(tool)) {
      updatedElement.points[1] = { x, y };
    }

    setCurrentElement(updatedElement);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;
    const updatedElements = [...elements, currentElement];
    setElements(updatedElements);
    setHistory([]);
    updateCanvas(updatedElements);
    setCurrentElement(null);
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="block"
      style={{
        cursor: ["pencil", "eraser", "line", "rectangle", "circle"].includes(tool)
          ? "crosshair"
          : "default",
        backgroundColor: canvasColor,
        border: "1px solid #444",
      }}
    />
  );
};

export default Board;












































































