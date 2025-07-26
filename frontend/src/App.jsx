import { useCallback, useEffect, useState } from "react";
import "./global.css";
import Peer from "peerjs";
import io from "socket.io-client";
import { filterUniqueUsers, getLocalStorage } from "./utils/helpers";
import toast from "react-hot-toast";
import Editor from "./components/editor";
import Header from "./components/header";
import PeersVideoWrapper from "./components/peers-video-wrapper";
import UserNameModal from "./components/modals/user-name.modal";
import { useNavigate, useParams } from "react-router-dom";
import ReactGA from "react-ga";
import { TRACKING_ID } from "./utils/constants";
import Footer from "./components/footer";
import Canvas from "./Canvas";

ReactGA.initialize(TRACKING_ID);

const myPeer = new Peer({
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:freeturn.net:3478" },
    ],
  },
});

const socket = io("https://codebuddies-backend.onrender.com/");
const peersObj = {};

function App() {
  const { roomId } = useParams();
  const [userId, setUserId] = useState("");
  const [peers, setPeers] = useState([]);
  const [userName, setUserName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const addVideoStream = useCallback(({ peerId, stream, userName }) => {
    setPeers((prevPeers) => {
      let flag = false;
      const updatedPeers = prevPeers.map((item) => {
        if (item.userId === peerId) {
          flag = true;
          return { ...item, stream, userName };
        }
        return item;
      });
      if (!flag) {
        updatedPeers.push({ userId: peerId, stream, userName });
      }
      return filterUniqueUsers(updatedPeers);
    });
  }, []);

  const connectToNewUser = useCallback(
    ({ remotePeerId, myStream, myUserName, remoteUserName }) => {
      const call = myPeer.call(remotePeerId, myStream, {
        metadata: { myUserName },
      });
      call.on("stream", (remoteVideoStream) => {
        addVideoStream({
          peerId: remotePeerId,
          stream: remoteVideoStream,
          userName: remoteUserName,
        });
      });
      call.on("close", () => {
        setPeers((prevPeers) =>
          prevPeers.filter((peer) => peer.userId !== remotePeerId)
        );
      });
      peersObj[remotePeerId] = call;
    },
    [addVideoStream]
  );

  useEffect(() => {
    myPeer.on("open", (id) => {
      setUserId(id);
    });

    const initialUserName = getLocalStorage("userName") || "";
    if (!initialUserName) {
      setIsModalOpen(true);
    } else {
      setUserName(initialUserName);
    }

    if (initialUserName && userId && roomId) {
      if (navigator) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            addVideoStream({
              peerId: userId,
              stream,
              userName: initialUserName,
            });

            socket.on("user-connected", (remotePeerId, remoteUserName) => {
              toast(`${remoteUserName} Joined!`, {
                icon: "🧑‍💻",
                id: "peer-connected",
              });
              connectToNewUser({
                remotePeerId,
                myStream: stream,
                myUserName: initialUserName,
                remoteUserName,
              });
            });

            myPeer.on("call", (call) => {
              const { myUserName = "" } = call.metadata;
              call.answer(stream);
              call.on("stream", (userVideoStream) => {
                addVideoStream({
                  peerId: call.peer,
                  stream: userVideoStream,
                  userName: myUserName,
                });
              });
              call.on("close", () => {
                setPeers((prevPeers) =>
                  prevPeers.filter((peer) => peer.userId !== call.peer)
                );
              });
              peersObj[call.peer] = call;
            });

            socket.emit("join-room", roomId, userId, initialUserName);
          })
          .catch((err) => {
            if (err.name === "NotAllowedError") {
              toast.error(
                "Permission denied. Please allow your camera and microphone permission required to work for PeerCoder."
              );
            } else if (err.name === "NotFoundError") {
              toast.error(
                "No media devices found. This could be due to missing or disconnected devices."
              );
            } else if (err.name === "NotReadableError") {
              toast.error(
                "Media input is not readable. This could be due to hardware failure or user denied access to media devices."
              );
            } else {
              toast.error("Error occurred while accessing media devices:");
              console.log(err);
            }
          });
      } else {
        console.error("navigator.mediaDevices is not supported");
      }

      socket.on("user-disconnected", (userId, userName) => {
        toast(`${userName} disconnected`, {
          icon: "🧑‍💻",
          id: "peer-connection-closed",
        });
        if (peersObj[userId]) peersObj[userId].close();
      });
    }
  }, [addVideoStream, connectToNewUser, roomId, userId, isModalOpen]);

  const handleVideoToggle = (userId) => {
    setPeers((prevPeers) =>
      prevPeers.map((peer) => {
        if (peer.userId === userId) {
          const enabled = peer.stream.getVideoTracks()[0].enabled;
          peer.stream.getVideoTracks()[0].enabled = !enabled;
          return peer;
        }
        return peer;
      })
    );
  };

  const handleAudioToggle = (userId) => {
    setPeers((prevPeers) =>
      prevPeers.map((peer) => {
        if (peer.userId === userId) {
          const enabled = peer.stream.getAudioTracks()[0].enabled;
          peer.stream.getAudioTracks()[0].enabled = !enabled;
          return peer;
        }
        return peer;
      })
    );
  };

  function handleEndCall() {
    myPeer.disconnect();
    socket.disconnect();
    navigate("/thanks", { replace: true });
  }

  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }, []);

  return (
    <main
      className="border-[0px] border-[#ffffff80] rounded-t-[10px] backdrop-blur-[8px]"
      style={{
        boxShadow:
          "2px 2px 10px rgba(0, 0, 0, 0.3), -2px 2px 10px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Header
        handleEndCall={handleEndCall}
        userName={userName}
        setIsModalOpen={setIsModalOpen}
        myPeerId={userId}
        handleVideoToggle={handleVideoToggle}
        handleAudioToggle={handleAudioToggle}
      />
      <PeersVideoWrapper peers={peers} userId={userId} />
      <Editor socket={socket} />
      <Canvas socket={socket} params={{ roomId }} />
      <Footer />
      <UserNameModal
        setIsModalOpen={setIsModalOpen}
        isModalOpen={isModalOpen}
        userName={userName}
        setUserName={setUserName}
      />
    </main>
  );
}

export default App;



