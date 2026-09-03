import React from 'react';
import { Button, DataTable, FilterField, MetricCard, PageHeader, Panel } from '../components/UI';
import { Icon } from '../icons';

export default function ActivityLogPage(){
 const rows=[
  ['May 31, 2026 10:34:21 AM',actor('MA','Macruf Ahmed','Owner'),'Users & Roles',action('Sign-in','blue'),'Successful staff sign-in from IP 197.210.45.12','Nairobi',success()],
  ['May 31, 2026 10:12:09 AM',actor('AH','Abdulkadir Hassan','General Manager'),'Tickets',action('Update','violet'),'Updated ticket #TKT/260901 — pending to issued','Nairobi',success()],
  ['May 31, 2026 09:58:47 AM',actor('NO','Nairobi Officer','Branch Operator'),'Cargo Desk',action('Update','violet'),'Updated cargo booking #CRG/260512','Nairobi',success()],
  ['May 31, 2026 09:41:15 AM',actor('MO','Mogadishu Officer','Branch Operator'),'Finance',action('Delete','red'),'Deleted expense record #EXP/260531-07','Mogadishu',success()],
  ['May 31, 2026 08:59:02 AM',actor('SY','System','Automated'),'System',action('Alert','orange'),'Unusual login attempt blocked','—',<span className="money-negative">Warning</span>],
 ];
 return <><PageHeader title="Activity Log" subtitle="A secured audit trail of all system activities, changes and security events."/>
 <div className="metrics-grid five"><MetricCard icon="trend" label="Total Actions Today" value="1,248" delta="↑ 18.6%" tone="blue"/><MetricCard icon="user" label="Sign-ins" value="326" delta="↑ 12.4%" tone="cyan"/><MetricCard icon="edit" label="Updates" value="682" delta="↑ 21.3%" tone="violet"/><MetricCard icon="trash" label="Deletions" value="84" delta="- 6.2%" tone="orange"/><MetricCard icon="alert" label="System Alerts" value="26" delta="- 13.6%" tone="red"/></div>
 <Panel style={{marginTop:14} as any}><div className="filter-row" style={{margin:0}}><FilterField label="User" value="All Users" icon="user"/><FilterField label="Role" value="All Roles" icon="users"/><FilterField label="Action Type" value="All Actions" icon="trend"/><FilterField label="Module" value="All Modules" icon="box"/><FilterField label="Branch" value="All Branches" icon="building"/><FilterField label="Date Range" value="May 1 – May 31, 2026" icon="calendar"/><Button variant="secondary" icon="filter">Filters</Button></div></Panel>
 <Panel title="Audit Events"><DataTable columns={['Time','User','Module','Action','Details','Branch','Status']} rows={rows}/></Panel></>}
function actor(i:string,n:string,r:string){return <div style={{display:'flex',gap:8,alignItems:'center'}}><div className="avatar" style={{width:30,height:30,color:'#31537f',background:'#eef3fb'}}>{i}</div><div><strong style={{fontSize:10}}>{n}</strong><div className="muted">{r}</div></div></div>}
function action(a:string,tone:any){return <span className={`status-badge status-${tone}`}>{a}</span>}
function success(){return <span className="money-positive" style={{display:'inline-flex',gap:4,alignItems:'center'}}><Icon name="check" size={13}/> Success</span>}
