'use client'
import React from 'react'

type Props = { children: React.ReactNode }

export default class ErrorBoundary extends React.Component<Props, {error: Error | null, info: any}> {
  constructor(props: Props){
    super(props)
    this.state = { error: null, info: null }
  }
  static getDerivedStateFromError(error: Error){
    return { error, info: null }
  }
  componentDidCatch(error: Error, info: any){
    // send to server for logging
    try{ fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: String(error.message), stack: error.stack, info }) }) }catch(_){ }
    this.setState({ error, info })
  }
  render(){
    if(this.state.error){
      return (
        <div className="p-4 rounded bg-red-900 text-white border border-red-700">
          <h3 className="font-bold mb-2">An error occurred</h3>
          <div className="text-sm whitespace-pre-wrap break-words"><strong>Message:</strong> {this.state.error?.message}</div>
          <div className="mt-2 text-xs whitespace-pre-wrap break-words"><strong>Stack:</strong> <pre className="text-xs">{this.state.error?.stack}</pre></div>
          <div className="mt-2 text-xs text-gray-200">The error has been logged to the server.</div>
        </div>
      )
    }
    return this.props.children
  }
}
