import React, { useEffect, useState } from 'react';
import { AppShell, RouteKey } from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import CargoPage from './pages/CargoPage';
import VisaPage from './pages/VisaPage';
import DailySummaryPage from './pages/DailySummaryPage';
import ExpensesPage from './pages/ExpensesPage';
import ClientsPage from './pages/ClientsPage';
import AccountsReceivablePage from './pages/AccountsReceivablePage';
import ReceiptsPage from './pages/ReceiptsPage';
import TrackingPage from './pages/TrackingPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import AccountsPayablePage from './pages/AccountsPayablePage';
import TeamRolesPage from './pages/TeamRolesPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import BusinessSettingsPage from './pages/BusinessSettingsPage';
import AdvancedSettingsPage from './pages/AdvancedSettingsPage';
import PublicLandingPage from './pages/PublicLandingPage';

const adminPages: Record<RouteKey, React.ComponentType> = {
  dashboard: DashboardPage,
  tickets: TicketsPage,
  cargo: CargoPage,
  visas: VisaPage,
  'daily-summary': DailySummaryPage,
  expenses: ExpensesPage,
  clients: ClientsPage,
  receivables: AccountsReceivablePage,
  receipts: ReceiptsPage,
  tracking: TrackingPage,
  'financial-reports': FinancialReportsPage,
  payables: AccountsPayablePage,
  activity: ActivityLogPage,
  team: TeamRolesPage,
  settings: SettingsPage,
  'business-settings': BusinessSettingsPage,
  'advanced-settings': AdvancedSettingsPage,
};

const previewOptions: {key:string;label:string}[] = [
  ['dashboard','Dashboard'],['tickets','Tickets'],['cargo','Cargo Desk'],['visas','Visa Applications'],['daily-summary','Daily Summary'],['expenses','Expenses'],['clients','Clients Registry'],['receivables','Accounts Receivable'],['receipts','Receipt Builder'],['tracking','Tracking Centre'],['financial-reports','Financial Reports'],['payables','Accounts Payable'],['team','Team & Roles'],['activity','Activity Log'],['settings','Agency Settings'],['business-settings','Business Settings'],['advanced-settings','Advanced Settings'],['public','Public Landing Page']
].map(([key,label])=>({key,label}));

function readRoute(){ return (window.location.hash.replace('#/','') || 'dashboard'); }

export default function App(){
  const [route,setRoute] = useState(readRoute());
  useEffect(()=>{const fn=()=>setRoute(readRoute()); window.addEventListener('hashchange',fn); return()=>window.removeEventListener('hashchange',fn)},[]);
  const navigate=(r:string)=>{window.location.hash=`#/${r}`;setRoute(r)};
  if(route==='public') return <><PublicLandingPage/><DevSwitcher route={route} navigate={navigate}/></>;
  const key=(route in adminPages?route:'dashboard') as RouteKey;
  const Page=adminPages[key];
  return <><AppShell active={key} onNavigate={navigate}><Page/></AppShell><DevSwitcher route={route} navigate={navigate}/></>;
}

function DevSwitcher({route,navigate}:{route:string;navigate:(x:string)=>void}){
  return <div className="reference-chip"><label>Preview screen:&nbsp;<select value={route} onChange={(e:any)=>navigate(e.target.value)} style={{background:'transparent',color:'white',border:0,outline:'none'}}>{previewOptions.map(o=><option key={o.key} value={o.key} style={{color:'#111'}}>{o.label}</option>)}</select></label></div>
}
