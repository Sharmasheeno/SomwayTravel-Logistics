import React from 'react';
import { BarChart, Donut, MetricCard, Panel, PageHeader, StatusBadge, DataTable } from '../components/UI';
import { Icon } from '../icons';

export default function DashboardPage(){
  const recent=[
    ['May 31','Ticket','NBO → DXB','Ahmed Hassan','USD 1,250',<StatusBadge tone="green">Completed</StatusBadge>],
    ['May 31','Cargo','Electronics Shipment','SomTech Solutions','USD 2,850',<StatusBadge tone="blue">In Transit</StatusBadge>],
    ['May 30','Visa','UK Business Visa','Blue Ocean Ltd','USD 620',<StatusBadge tone="orange">Processing</StatusBadge>],
    ['May 30','Ticket','MOG → IST','Horizon Group','USD 780',<StatusBadge tone="green">Completed</StatusBadge>],
  ];
  return <>
    <PageHeader title="Good evening, Macruf 👋" subtitle="Here’s what’s happening with SomWay today." />
    <div className="metrics-grid six">
      <MetricCard icon="money" label="Total Revenue" value="USD 66,540" delta="↑ 18.6%" tone="cyan" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="box" label="Total Cargo Shipments" value="152" delta="↑ 12.4%" tone="blue" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="wallet" label="Accounts Receivable" value="USD 18,420" delta="↑ 8.7%" tone="green" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="users" label="Total Clients" value="247" delta="↑ 15.1%" tone="violet" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="passport" label="Visa Applications" value="183" delta="↑ 21.3%" tone="cyan" foot="vs Apr 1 – Apr 30"/>
      <MetricCard icon="ticket" label="Tickets Issued" value="328" delta="↑ 13.8%" tone="blue" foot="vs Apr 1 – Apr 30"/>
    </div>
    <div className="split-3" style={{marginTop:14}}>
      <Panel title="Monthly Revenue Trend" subtitle="Revenue (USD)"><BarChart values={[20,31,42,50,47,60,55,61,68,63,70,85]} labels={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']}/></Panel>
      <Panel title="Revenue by Service"><Donut total="66,540" centerLabel="USD" segments={[{value:45,color:'#0b66e3',label:'Ticketing',amount:'45.2%'},{value:32,color:'#00a9c7',label:'Cargo',amount:'32.1%'},{value:23,color:'#3bbf63',label:'Visa',amount:'22.7%'}]}/></Panel>
      <Panel title="Cargo Tracking Status"><div className="stack">
        {[['Pending','18','orange'],['In Transit','67','blue'],['Arrived','32','cyan'],['Delivered','35','green']].map(x=><div key={x[0]} style={{display:'grid',gridTemplateColumns:'36px 1fr auto',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #edf1f6'}}><div className={`metric-icon tone-${x[2]}`} style={{width:34,height:34}}><Icon name={x[0]==='Delivered'?'check':'box'} size={17}/></div><strong style={{fontSize:11}}>{x[0]}</strong><b style={{fontSize:11}}>{x[1]}</b></div>)}
      </div></Panel>
    </div>
    <div className="split-2" style={{marginTop:14}}>
      <Panel title="Recent Transactions" actions={<a className="linkish" style={{fontSize:10}}>View All</a>}><DataTable columns={['Date','Type','Description','Client','Amount','Status']} rows={recent}/></Panel>
      <div className="split-even">
        <Panel title="Tasks & Alerts"><div className="timeline">
          {[['Visa application approvals','12 applications pending review','passport'],['Cargo arrivals today','4 shipments arriving','box'],['Payment reminders','8 invoices awaiting payment','wallet'],['Ticketing follow-ups','3 bookings require follow-up','ticket']].map((x,i)=><div className="timeline-row" key={i}><i className="timeline-dot"><Icon name={x[2] as any} size={13}/></i><div><strong>{x[0]}</strong><span>{x[1]}</span></div><time>{i+1}h</time></div>)}
        </div></Panel>
        <Panel title="Recent Clients"><div className="stack">{['Abdi Wholesale Ltd','SomTech Solutions','Blue Ocean Ltd','Horizon Group'].map((x,i)=><div key={x} style={{display:'grid',gridTemplateColumns:'34px 1fr auto',gap:8,alignItems:'center'}}><div className="avatar" style={{width:34,height:34,color:'#31537f',background:'#edf3fb'}}>{x.slice(0,2).toUpperCase()}</div><div><strong style={{fontSize:10,display:'block'}}>{x}</strong><span className="muted">{i%2?'Mogadishu':'Nairobi'}</span></div><StatusBadge tone="blue">Corporate</StatusBadge></div>)}</div></Panel>
      </div>
    </div>
  </>
}
