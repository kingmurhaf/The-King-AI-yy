import { useApp } from './AppContext.jsx'

export default function Toast() {
  const { state } = useApp()
  return (
    <div className={`toast${state.toast ? ' on' : ''}`}
      dangerouslySetInnerHTML={{ __html: state.toast || '' }} />
  )
}
