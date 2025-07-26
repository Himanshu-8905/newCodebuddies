"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import {
  abcdef,
  androidstudio,
  xcodeDark,
  githubDark,
  bbedit,
  githubLight,
  basicLight,
  atomone,
} from "@uiw/codemirror-themes-all";
import EditorToolbar from "./editor-toolbar";
import {
  defaultCCode,
  defaultCPPCode,
  defaultJavaCode,
  defaultPythonCode,
  defaultJSCode
} from "../utils/defaults";
import {
  debounce,
  deleteLocalStorage,
  getLocalStorage,
  setLocalStorage,
} from "../utils/helpers";
import toast from "react-hot-toast";

export const LanguageTypes = ["java", "python", "c", "cpp", "javascript"];

export const ThemeTypes = [
  "abcdef",
  "atomone",
  "androidstudio",
  "xcodeDark",
  "bbedit",
  "githubLight",
  "githubDark",
  "basicLight"
];

const languages = {
  python: python(),
  java: java(),
  c: cpp(),
  cpp: cpp(),
  javascript: javascript(),
};
const themes = {
  abcdef,
  atomone,
  androidstudio,
  xcodeDark,
  githubDark,
  bbedit,
  githubLight,
  basicLight,
};

const Editor = ({ socket }) => {
  const [selectedLanguage, setSelectedLanguage] = useState("java");
  const [selectedTheme, setSelectedTheme] = useState("githubDark");
  const [executionInProgress, setExecutionInProgress] = useState(false);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const extensionLanguage = languages[selectedLanguage];
  const extensionTheme = themes[selectedTheme];
  const setLocalStorageDebounced = useRef(debounce(setLocalStorage, 300));
  const isReceivingCode = useRef(false);

  useEffect(() => {
    const localInput = getLocalStorage("input");
    const localLang = getLocalStorage("selectedLanguage");
    if (localInput) setInput(localInput);
    if (localLang) setSelectedLanguage(localLang);
  }, []);

  useEffect(() => {
    const localLang = getLocalStorage("selectedLanguage");
    if (localLang) setSelectedLanguage(localLang);

    const localCode = getLocalStorage("code");
    if (localCode) {
      setCode(localCode);
    } else {
      switch (selectedLanguage) {
        case "java": setCode(defaultJavaCode); break;
        case "cpp": setCode(defaultCPPCode); break;
        case "c": setCode(defaultCCode); break;
        case "python": setCode(defaultPythonCode); break;
        case "javascript": setCode(defaultJSCode); break;
      }
    }
  }, [selectedLanguage]);

  useEffect(() => {
    const sendDataToNewUser = () => {
      socket.emit("data-for-new-user", {
        code, input, output, selectedLanguage
      });
    };

    socket.on("receive code", handleReceiveCode);
    socket.on("receive input", handleReceiveInput);
    socket.on("receive output", handleReceiveOutput);
    socket.on("mode-change-receive", handleReceiveModeChange);
    socket.on("receive-data-for-new-user", handleReceiveAllData);
    socket.on("user-connected", sendDataToNewUser);

    return () => {
      socket.off("receive code", handleReceiveCode);
      socket.off("receive input", handleReceiveInput);
      socket.off("receive output", handleReceiveOutput);
      socket.off("mode-change-receive", handleReceiveModeChange);
      socket.off("receive-data-for-new-user", handleReceiveAllData);
      socket.off("user-connected", sendDataToNewUser);
    };
  }, [code, input, output, selectedLanguage, socket]);

  const handleReceiveCode = (payload) => {
    isReceivingCode.current = true;
    setCode(payload);
    setLocalStorageDebounced.current("code", payload);
    setTimeout(() => (isReceivingCode.current = false), 200);
  };

  const handleReceiveInput = (payload) => {
    setInput(payload);
    setLocalStorageDebounced.current("input", payload);
  };

  const handleReceiveOutput = (payload) => {
    setOutput(payload);
    setLocalStorage("output", payload);
  };

  const handleReceiveAllData = ({ code, input, output, selectedLanguage }) => {
    setInput(input);
    setOutput(output);
    setCode(code);
    setSelectedLanguage(selectedLanguage);
    setLocalStorage("code", code);
    setLocalStorage("input", input);
    setLocalStorage("output", output);
    setLocalStorage("selectedLanguage", selectedLanguage);
  };

  const handleReceiveModeChange = (payload) => {
    setSelectedLanguage(payload);
    setLocalStorage("selectedLanguage", payload);
  };

  const handleChangeCode = (value) => {
    if (isReceivingCode.current) {
      toast.error("Only one user can type at a time", { id: "code-change" });
      return;
    }
    setCode(value);
    setLocalStorageDebounced.current("code", value);
    socket.emit("code change", value);
  };

  const handleChangeInput = (value) => {
    setInput(value);
    setLocalStorageDebounced.current("input", value);
    socket.emit("input change", value);
  };

  const handleChangeOutput = (value) => {
    setOutput(value);
    setLocalStorage("output", value);
    socket.emit("output change", value);
  };

  const handleChangeLanguage = (value) => {
    setSelectedLanguage(value);
    setLocalStorage("selectedLanguage", value);
    socket.emit("mode-change-send", value);
  };

  const resetEditorForMe = () => {
    setCode(defaultJavaCode);
    setInput("");
    setOutput("");
    setSelectedTheme("githubDark");
    setSelectedLanguage("java");
    deleteLocalStorage("code");
    deleteLocalStorage("input");
    deleteLocalStorage("output");
    deleteLocalStorage("selectedLanguage");
  };

  const handleRunClick = async () => {
    setExecutionInProgress(true);
    const langRuntimeVersions = {
      python: { version: "3.10.0" },
      java: { version: "15.0.2" },
      c: { version: "10.2.0" },
      cpp: { version: "10.2.0" },
      javascript: { version: "18.15.0" },
    };
    const { version } = langRuntimeVersions[selectedLanguage];

    const requestBody = {
      language: selectedLanguage,
      version,
      files: [{
        name: `main.${selectedLanguage === "python" ? "py" : selectedLanguage === "javascript" ? "js" : selectedLanguage}`,
        content: code,
      }],
      stdin: input
    };

    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unknown error");

      let output = "";
      if (result?.run?.stdout) output += result.run.stdout.trim();
      if (result?.run?.stderr) output += result.run.stderr.trim();
      if (result?.run?.signal) toast.error("Error: SIGKILL, try again");

      setOutput(output);
      handleChangeOutput(output);
    } catch (err) {
      console.error("Execution failed:", err);
    } finally {
      setExecutionInProgress(false);
    }
  };

  return (
    <div>
      <EditorToolbar
        config={{
          selectedLanguage,
          selectedTheme,
          executionInProgress,
          setSelectedLanguage: handleChangeLanguage,
          setSelectedTheme,
          handleRunClick,
          resetEditorForMe,
        }}
      />
      <PanelGroup autoSaveId="example" direction="horizontal">
        <Panel className="min-h-[70vh]" minSize={50}>
          <CodeMirror
            value={code}
            onChange={handleChangeCode}
            extensions={[extensionLanguage]}
            theme={extensionTheme}
            height="70vh"
          />
        </Panel>
        <PanelResizeHandle className="bg-transparent w-[3px]" />
        <Panel minSize={25} defaultSize={30}>
          <PanelGroup autoSaveId="example" direction="vertical">
            <Panel minSize={25}>
              <CodeMirror
                placeholder="Enter your input values..."
                value={input}
                onChange={handleChangeInput}
                extensions={[]}
                theme={extensionTheme}
                height="280px"
              />
            </Panel>
            <PanelResizeHandle className="bg-transparent h-[3px]" />
            <Panel minSize={25}>
              <CodeMirror
                placeholder="Output will be printed here"
                readOnly
                value={output}
                extensions={[]}
                theme={extensionTheme}
                height="280px"
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default Editor;
