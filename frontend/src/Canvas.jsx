import React, { useEffect, useRef, useState } from "react";
import Board from "./components/Board";
import Toolbar from "./components/Toolbar";
import "./global.css";

function Canvas({ socket, params }) {
  const canvasRef = useRef(null);
  const ctx = useRef(null);

  const [color, setColor] = useState("#ffffff");
  const [tool, setTool] = useState("pencil");
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);
  const [canvasColor, setCanvasColor] = useState("#121212");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [userName, setUserName] = useState("Anonymous");
  const [messages, setMessages] = useState([]);
  const [isLive, setIsLive] = useState(false); // enable real-time mode

  const roomId = params?.roomId || "local";

  // Load initial state (either from localStorage or server)
  useEffect(() => {
    const storedUserName = localStorage.getItem("userName") || "Anonymous";
    setUserName(storedUserName);

    const localKey = `savedCanvas-${roomId}`;

    if (!socket) {
      // Offline fallback
      const savedCanvas = localStorage.getItem(localKey);
      if (savedCanvas) {
        const { elements: savedElements, canvasColor: savedCanvasColor } = JSON.parse(savedCanvas);
        setElements(savedElements || []);
        setCanvasColor(savedCanvasColor || "#121212");
      }
      return;
    }

    setIsLive(true); // online mode

    // Request latest canvas data from server
    socket.on("load-canvas", (loadedElements) => {
      setElements(loadedElements || []);
    });

    socket.on("canvas-update", (incomingElements) => {
      setElements(incomingElements);
    });

    socket.on("canvas-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("load-canvas");
      socket.off("canvas-update");
      socket.off("canvas-message");
    };
  }, [socket, roomId]);

  // Save locally when offline
  useEffect(() => {
    if (!isLive) {
      const localKey = `savedCanvas-${roomId}`;
      const canvasData = {
        elements,
        canvasColor,
      };
      localStorage.setItem(localKey, JSON.stringify(canvasData));
    }
  }, [elements, canvasColor, isLive, roomId]);

  // Updates both local state and broadcasts to other peers if live
  const updateCanvas = (updatedElements) => {
    setElements(updatedElements);
    if (isLive && socket) {
      socket.emit("canvas-update", {
        roomId,
        elements: updatedElements,
      });
    }
  };

  const sendMessage = (message) => {
    const data = {
      message,
      userName,
    };
    setMessages((prev) => [...prev, data]);

    if (isLive && socket) {
      socket.emit("canvas-message", {
        roomId,
        message,
        userName,
      });
    }
  };

  return (
    <div className="absolute">
      <div className="fixed top-10 ml-36 z-20">
        <Toolbar
          color={color}
          setColor={setColor}
          tool={tool}
          setTool={setTool}
          history={history}
          setHistory={setHistory}
          elements={elements}
          setElements={setElements}
          canvasRef={canvasRef}
          canvasColor={canvasColor}
          setCanvasColor={setCanvasColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          userName={userName}
          setUserName={setUserName}
          isLive={isLive}
          setIsLive={setIsLive}
          params={params}
          updateCanvas={updateCanvas}
          messages={messages}
          sendMessage={sendMessage}
          socketId={socket?.id || null}
        />
      </div>
      <Board
        canvasRef={canvasRef}
        ctx={ctx}
        color={color}
        tool={tool}
        elements={elements}
        setElements={setElements}
        history={history}
        setHistory={setHistory}
        canvasColor={canvasColor}
        strokeWidth={strokeWidth}
        updateCanvas={updateCanvas}
      />
    </div>
  );
}

export default Canvas;




