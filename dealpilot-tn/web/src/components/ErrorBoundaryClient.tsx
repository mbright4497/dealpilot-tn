"use client"
import React from 'react'

export default class ErrorBoundaryClient extends React.Component<any,{hasError:boolean,error:any}> {
  constructor(props:any){ super(props); this.state={ hasError:false, error:null } }
  static getDerivedStateFromError(error:any){ return { hasError:true, error } }
  componentDidCatch(error:any, info:any){
    try{ fetch('/api/audit/log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'component_error', resource:'RecentAiInterpretations', details: { error: String(error?.message||error), info } }) }) }catch(e){ console.warn('error logging failed', e) }
    console.error('ErrorBoundary caught', error, info)
  }
  render(){ if(this.state.hasError) return (<div className="p-2 text-sm text-red-400">Interpretations temporarily unavailable.</div>); return this.props.children }
}
