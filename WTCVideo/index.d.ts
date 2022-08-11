import React from 'react'

export interface I_WTCVideoRefProps {
  screenshot: () => Promise<HTMLCanvasElement>
}

declare class WTCVideo extends React.Component<I_WTCVideoRefProps, any> {}

declare module 'WTCVideo' {}

export default WTCVideo
