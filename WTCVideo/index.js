"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_2 = require("react");
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const html2canvas_1 = __importDefault(require("html2canvas"));
const react_3 = __importDefault(require("react"));
const rtspSetting = {
    iceconfig: {
        iceServers: [
            {
                urls: ['stun:stun.l.google.com:19302'],
            },
        ],
    },
    server: '/stream',
};
const WTCVideo = ({ suuid, hidden, onPlay, muted }, ref) => {
    const videoElemRef = (0, react_1.useRef)(null);
    (0, react_2.useEffect)(() => {
        const stream = new MediaStream();
        const pc = new RTCPeerConnection(rtspSetting.iceconfig);
        pc.onnegotiationneeded = handleNegotiationNeededEvent;
        pc.ontrack = (event) => {
            stream.addTrack(event.track);
            if (videoElemRef.current) {
                const videoElem = videoElemRef.current;
                videoElem.srcObject = stream;
                videoElem.onloadeddata = () => {
                    onPlay && onPlay();
                };
            }
            else {
                console.warn('👹videoElem is null');
            }
        };
        function handleNegotiationNeededEvent() {
            return __awaiter(this, void 0, void 0, function* () {
                let offer = yield pc.createOffer();
                yield pc.setLocalDescription(offer);
                getRemoteSdp(pc, suuid);
            });
        }
        getCodecInfo(pc, suuid);
        return () => {
            try {
                stopStreamed(stream);
                pc.ontrack = null;
                pc.onnegotiationneeded = null;
                pc.close();
            }
            catch (error) { }
        };
    }, [suuid]);
    (0, react_1.useImperativeHandle)(ref, () => ({
        screenshot: () => {
            if (!videoElemRef.current)
                throw new Error('videoElemRef null');
            return (0, html2canvas_1.default)(videoElemRef.current);
        },
    }));
    return (react_3.default.createElement("video", { ref: videoElemRef, style: {
            width: '100%',
            height: '100%',
            display: `${hidden ? 'none' : 'block'}`,
        }, autoPlay: true, muted: muted }));
};
exports.default = (0, react_1.forwardRef)(WTCVideo);
function getCodecInfo(pc, suuid) {
    axios_1.default
        .get(`${rtspSetting.server}/codec/${suuid}`)
        .then((response) => {
        const data = response.data;
        try {
            data.forEach((data) => {
                pc.addTransceiver(data.Type, {
                    direction: 'sendrecv',
                });
            });
        }
        catch (e) {
            console.warn('不通喔....', suuid);
        }
    })
        .catch((err) => {
        console.error(err);
    });
}
function getRemoteSdp(pc, suuid) {
    if (!pc.localDescription) {
        console.warn(`👹Cannot getRemoteSdp`);
        return;
    }
    axios_1.default
        .post(`${rtspSetting.server}/receiver/${suuid}`, {
        suuid: suuid,
        data: btoa(pc.localDescription.sdp),
    }, {
        transformRequest: [
            function (data) {
                return qs_1.default.stringify(data, {
                    arrayFormat: 'brackets',
                });
            },
        ],
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
        .then((response) => {
        const data = response.data;
        try {
            if (pc.signalingState === 'closed')
                return;
            pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: atob(data),
            }));
        }
        catch (e) {
            console.warn(e);
        }
    });
}
function stopStreamed(stream) {
    const tracks = stream.getTracks();
    tracks.forEach(function (track) {
        track.stop();
    });
}
