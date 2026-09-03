import React, { ReactNode } from 'react';
import { Icon, IconName } from '../icons';

export type RouteKey = 'dashboard'|'tickets'|'cargo'|'visas'|'daily-summary'|'expenses'|'clients'|'receivables'|'receipts'|'tracking'|'financial-reports'|'payables'|'activity'|'team'|'settings'|'business-settings'|'advanced-settings';

type Item={key:RouteKey;label:string;icon:IconName};
const items:Item[]=[
  {key:'dashboard',label:'Dashboard',icon:'dashboard'},
  {key:'tickets',label:'Bookings',icon:'plane'},
  {key:'cargo',label:'Cargo',icon:'box'},
  {key:'visas',label:'Visa Services',icon:'passport'},
  {key:'clients',label:'Clients',icon:'users'},
  {key:'receivables',label:'Finance',icon:'money'},
  {key:'financial-reports',label:'Reports',icon:'chart'},
  {key:'daily-summary',label:'Operations',icon:'settings'},
  {key:'business-settings',label:'Branches',icon:'building'},
  {key:'team',label:'Users & Roles',icon:'users'},
  {key:'settings',label:'Settings',icon:'settings'},
];

export function AppShell({active,onNavigate,children}: {active:RouteKey;onNavigate:(r:RouteKey)=>void;children:ReactNode}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><img src="/somway-logo.png" alt="SomWay"/></div>
      <nav>{items.map(it=><button key={it.key} className={active===it.key?'active':''} onClick={()=>onNavigate(it.key)}><Icon name={it.icon}/><span>{it.label}</span></button>)}</nav>
      <div className="sidebar-promo"><span>Delivering journeys.</span><strong>Connecting possibilities.</strong><Icon name="plane" size={48}/><button>View Company Profile</button></div>
      <div className="sidebar-user"><div className="avatar">MA</div><div><strong>Macruf Ahmed</strong><span>Owner</span></div><Icon name="chevron" size={16}/></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="workspace"><Icon name="menu"/><i></i><div><strong>Owner Workspace</strong><span>Overview of SomWay Travel & Logistics operations</span></div></div><div className="top-actions"><button><Icon name="building" size={16}/> All Branches <Icon name="chevron" size={14}/></button><button><Icon name="calendar" size={16}/> May 1 – May 31, 2025 <Icon name="chevron" size={14}/></button><button className="icon-btn"><Icon name="bell"/><b>3</b></button><button className="round-mark"><Icon name="plane"/></button></div></header>
      <main className="content">{children}</main>
    </div>
  </div>
}
