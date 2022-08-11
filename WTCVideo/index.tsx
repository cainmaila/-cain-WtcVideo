import { forwardRef, Ref, useImperativeHandle, useRef } from 'react'
import { useEffect } from 'react'
import axios from 'axios'
import qs from 'qs'
import html2canvas from 'html2canvas'
import React from 'react'

export const rtspSetting = {
  iceconfig: {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
  },
  server: '',
}

type Props = {
  suuid: string
  hidden?: boolean
  onPlay?: () => void
  muted?: boolean
}

export interface I_WTCVideoRefProps {
  screenshot: () => Promise<HTMLCanvasElement>
}

const WTCVideo = ({ suuid, hidden, onPlay, muted }: Props, ref: Ref<I_WTCVideoRefProps>) => {
  const videoElemRef = useRef(null)

  useEffect(() => {
    const stream = new MediaStream()
    const pc = new RTCPeerConnection(rtspSetting.iceconfig)
    pc.onnegotiationneeded = handleNegotiationNeededEvent
    pc.ontrack = (event) => {
      stream.addTrack(event.track)
      if (videoElemRef.current) {
        const videoElem: HTMLVideoElement = videoElemRef.current
        videoElem.srcObject = stream
        videoElem.onloadeddata = () => {
          onPlay && onPlay()
        }
      } else {
        console.warn('👹videoElem is null')
      }
    }
    async function handleNegotiationNeededEvent() {
      let offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      getRemoteSdp(pc, suuid)
    }
    getCodecInfo(pc, suuid)

    return () => {
      try {
        stopStreamed(stream)
        pc.ontrack = null
        pc.onnegotiationneeded = null
        pc.close()
      } catch (error) {}
    }
  }, [suuid])

  useImperativeHandle(ref, () => ({
    screenshot: () => {
      if (!videoElemRef.current) throw new Error('videoElemRef null')
      return html2canvas(videoElemRef.current)
    },
  }))

  return (
    <video
      ref={videoElemRef}
      style={{
        width: '100%',
        height: '100%',
        display: `${hidden ? 'none' : 'block'}`,
      }}
      autoPlay
      muted={muted}
    ></video>
  )
}

export default forwardRef(WTCVideo)

interface I_typeData {
  Type: string
}

function getCodecInfo(pc: RTCPeerConnection, suuid: string) {
  axios.get(`${rtspSetting.server}/codec/${suuid}`).then((response) => {
    const data = response.data
    try {
      data.forEach((data: I_typeData) => {
        pc.addTransceiver(data.Type, {
          direction: 'sendrecv',
        })
      })
    } catch (e) {
      console.warn('不通喔....', suuid)
    }
  })
}

function getRemoteSdp(pc: RTCPeerConnection, suuid: string) {
  if (!pc.localDescription) {
    console.warn(`👹Cannot getRemoteSdp`)
    return
  }
  axios
    .post(
      `${rtspSetting.server}/receiver/${suuid}`,
      {
        suuid: suuid,
        data: btoa(pc.localDescription.sdp),
      },
      {
        transformRequest: [
          function (data) {
            return qs.stringify(data, {
              arrayFormat: 'brackets',
            })
          },
        ],
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
    .then((response) => {
      const data = response.data
      try {
        if (pc.signalingState === 'closed') return
        pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: atob(data),
          }),
        )
      } catch (e) {
        console.warn(e)
      }
    })
}

function stopStreamed(stream: MediaStream) {
  const tracks = stream.getTracks()
  tracks.forEach(function (track) {
    track.stop()
  })
}
