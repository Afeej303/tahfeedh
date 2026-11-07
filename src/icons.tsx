import type { ReactNode, SVGProps } from 'react'
type IconProps = SVGProps<SVGSVGElement> & { size?: number }
const shapes: Record<string, ReactNode> = {
  Sparkles:<><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 14 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/></>,
  Home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
  Library:<><path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z"/><path d="M8 8h7M8 12h7M8 16h5"/></>,
  Clock3:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  Target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  BookOpen:<><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v17H5a2 2 0 0 0-2 2V5.5ZM21 5.5A2.5 2.5 0 0 0 18.5 3H12v17h7a2 2 0 0 1 2 2V5.5Z"/></>,
  ListChecks:<><path d="m4 6 1.5 1.5L8 5M11 6h9M4 12l1.5 1.5L8 11M11 12h9M4 18l1.5 1.5L8 17M11 18h9"/></>,
  Flame:<><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-2-1-3-3-3-5-3 3-4 6-4 9a7 7 0 0 0 7 7Z"/><path d="M12 22a3 3 0 0 0 3-3c0-2-2-3-3-5-1 2-3 3-3 5a3 3 0 0 0 3 3Z"/></>,
  Plus:<path d="M12 5v14M5 12h14"/>, Check:<path d="m5 12 4 4L19 6"/>, X:<path d="m18 6-12 12M6 6l12 12"/>,
  ChevronDown:<path d="m6 9 6 6 6-6"/>, ChevronLeft:<path d="m15 18-6-6 6-6"/>, ChevronRight:<path d="m9 18 6-6-6-6"/>,
  Search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, FileText:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
  Settings2:<><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>, Bookmark:<><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z"/></>,
  CircleHelp:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-1.1 1.1-1.8 1.3-1.8 3.2M12 17h.01"/></>, MoreHorizontal:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  Play:<path d="m7 4 14 8-14 8V4Z"/>,
}
const names=['Sparkles','Home','Library','Clock3','Target','BookOpen','ListChecks','Flame','Plus','Check','X','ChevronDown','ChevronLeft','ChevronRight','Search','FileText','Settings2','Bookmark','CircleHelp','MoreHorizontal','Play'] as const
type IconName=typeof names[number]
const makeIcon=(name:IconName)=>(props:IconProps)=><svg xmlns="http://www.w3.org/2000/svg" width={props.size??24} height={props.size??24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{shapes[name]}</svg>
export const Sparkles=makeIcon('Sparkles'),Home=makeIcon('Home'),Library=makeIcon('Library'),Clock3=makeIcon('Clock3'),Target=makeIcon('Target'),BookOpen=makeIcon('BookOpen'),ListChecks=makeIcon('ListChecks'),Flame=makeIcon('Flame'),Plus=makeIcon('Plus'),Check=makeIcon('Check'),X=makeIcon('X'),ChevronDown=makeIcon('ChevronDown'),ChevronLeft=makeIcon('ChevronLeft'),ChevronRight=makeIcon('ChevronRight'),Search=makeIcon('Search'),FileText=makeIcon('FileText'),Settings2=makeIcon('Settings2'),Bookmark=makeIcon('Bookmark'),CircleHelp=makeIcon('CircleHelp'),MoreHorizontal=makeIcon('MoreHorizontal'),Play=makeIcon('Play')
