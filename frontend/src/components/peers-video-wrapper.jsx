
import { Video } from "../video";

const PeersVideoWrapper = ({
  peers,
  userId,
}) => {
  return (
    <div
      className="relative  min-h-[150px] border-t-0 border-[1px] border-[#ffffff1f] pr-[200px]"
      style={{
        boxShadow: "rgb(0 0 0 / 50%) 0px 0px 5px inset",
      }}
    >
      <div className="flex flex-start gap-x-[15px] px-[20px] py-[5px] overflow-x-auto">
        {peers.map((peer, index) => (
          <Video
            key={index}
            peer={peer}
            muted={userId === peer.userId ? true : false}
          ></Video>
        ))}
      </div>
    </div>
  );
};

export default PeersVideoWrapper;
